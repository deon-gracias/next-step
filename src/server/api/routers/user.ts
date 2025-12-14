import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, ilike, and, ne } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";
import { user, member, resident, invitation } from "@/server/db/schema"; // ✅ Add invitation
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ac } from "@/lib/permissions";

import { inArray } from "drizzle-orm";
import { facility, memberFacility } from "@/server/db/schema";
import { authClient } from "@/components/providers/auth-client";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";

// TODO: Add appropriate types
export async function getAllowedFacilities(ctx: { session: { user: { id: string; email: string; emailVerified: boolean; name: string; createdAt: Date; updatedAt: Date; image?: string | null | undefined | undefined; }; session: { id: string; userId: string; expiresAt: Date; createdAt: Date; updatedAt: Date; token: string; ipAddress?: string | null | undefined | undefined; userAgent?: string | null | undefined | undefined; activeOrganizationId?: string | null | undefined; }; }; headers: Headers; db: PostgresJsDatabase<typeof import("@/server/db/schema")> & { $client: Sql<{}>; }; }) {
  const userId = ctx.session.user.id;

  const [memberRecord] = await ctx.db
    .select()
    .from(member)
    .where(eq(member.userId, userId))
    .limit(1);

  if (!memberRecord) throw new Error("Not a member");

  const assignedFacilities = await ctx.db
    .select()
    .from(memberFacility)
    .where(eq(memberFacility.userId, memberRecord.userId));

  console.log(
    "Assigned Facilities",
    assignedFacilities,
    memberRecord,
    `userId = ${userId}`,
  );

  if (!assignedFacilities.length) return [];

  return ctx.db
    .select()
    .from(facility)
    .where(
      inArray(
        facility.id,
        assignedFacilities.map((f) => f.facilityId),
      ),
    );
}

export const userRouter = createTRPCRouter({
  // Add the byId procedure
  byId: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "User ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [userRecord] = await ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .where(eq(user.id, input.id))
        .limit(1);

      if (!userRecord) {
        throw new Error("User not found");
      }

      return userRecord;
    }),

  listInOrg: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        role: z.string().optional(),
        ...paginationInputSchema.shape, // expects `page`, `pageSize`
      }),
    )
    .query(async ({ ctx, input }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        // Protected route did we sacrifice
        throw Error("Failedd to get session");
      }

      const { organizationId, search, page, pageSize, role } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [
        // ne(user.id, session.user.id),
        eq(member.organizationId, organizationId),
      ];

      if (search) conditions.push(ilike(user.name, `%${search}%`));
      if (role) conditions.push(ilike(member.role, `%${role}%`));

      const results = await ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: member.role,
          createdAt: member.createdAt,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(...conditions))
        .limit(pageSize)
        .offset(offset);

      return results;
    }),

  // ✅ UPDATED: Now stores the custom role in invitation table
  assignToFacility: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        organizationId: z.string(),
        facilityId: z.number(),
        role: z.string(), // ✅ Add custom role
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if requesting member exists in the database
      const [requestingMember] = await ctx.db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, ctx.session.user.id),
            eq(member.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!requestingMember) {
        throw new Error("Requesting user is not a member of this organization");
      }

      // Check if user can assign
      const canAssign = await auth.api.hasPermission({
        headers: await headers(),
        body: {
          permission: { member: ["create", "update"] },
        },
      });

      if (!canAssign) {
        throw new Error(
          "You do not have permission to assign users to facilities",
        );
      }

      // Check if facility exists
      const [facilityExists] = await ctx.db
        .select()
        .from(facility)
        .where(eq(facility.id, input.facilityId))
        .limit(1);

      if (!facilityExists) {
        throw new Error("Facility not found");
      }

      // ✅ Update the pending invitation with the custom role
      await ctx.db
        .update(invitation)
        .set({ role: input.role })
        .where(
          and(
            eq(invitation.email, input.email),
            eq(invitation.organizationId, input.organizationId),
            eq(invitation.status, "pending")
          )
        );

      // Check if user already exists
      const [userFromEmail] = await ctx.db
        .select()
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);

      // If user exists, assign to facility and update role
      if (userFromEmail) {
        // ✅ Update member role if they're already a member
        const [existingMember] = await ctx.db
          .select()
          .from(member)
          .where(
            and(
              eq(member.userId, userFromEmail.id),
              eq(member.organizationId, input.organizationId)
            )
          )
          .limit(1);

        if (existingMember) {
          await ctx.db
            .update(member)
            .set({ role: input.role })
            .where(eq(member.id, existingMember.id));
        }

        // Insert facility assignment
        await ctx.db.insert(memberFacility).values({
          userId: userFromEmail.id,
          facilityId: input.facilityId,
        });
      }

      return { success: true };
    }),

  // ✅ NEW: Update member role when they accept invitation
  // In your user router
  updateRoleOnAcceptance: publicProcedure // ✅ Change from protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ✅ Manual auth check - allow if updating your own role
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        throw new Error("Not authenticated");
      }

      // ✅ Only allow updating your own role
      if (session.user.id !== input.userId) {
        throw new Error("Can only update your own role");
      }

      // Get user email
      const [userRecord] = await ctx.db
        .select()
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!userRecord) {
        throw new Error("User not found");
      }

      // Find the invitation with custom role
      const [inv] = await ctx.db
        .select()
        .from(invitation)
        .where(
          and(
            eq(invitation.email, userRecord.email),
            eq(invitation.organizationId, input.organizationId)
          )
        )
        .limit(1);

      if (!inv || !inv.role) {
        return { success: false, message: "No custom role found" };
      }

      // Find the member record
      const [memberRecord] = await ctx.db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, input.userId),
            eq(member.organizationId, input.organizationId)
          )
        )
        .limit(1);

      if (memberRecord) {
        // ✅ Update member table with custom role from invitation
        await ctx.db
          .update(member)
          .set({ role: inv.role })
          .where(eq(member.id, memberRecord.id));

        return { success: true, role: inv.role };
      }

      return { success: false, message: "Member not found" };
    }),

  // In your invitation router
  updateRole: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        organizationId: z.string(),
        role: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update the invitation with the custom role
      await ctx.db
        .update(invitation)
        .set({ role: input.role })
        .where(
          and(
            eq(invitation.email, input.email),
            eq(invitation.organizationId, input.organizationId),
            eq(invitation.status, "pending")
          )
        );

      return { success: true };
    }),



  getForOrg: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const facilities = await getAllowedFacilities(ctx);

      if (!facilities.length) return [];

      return facilities[0];
    }),
});
