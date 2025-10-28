// server/api/routers/invitation.ts
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { invitation } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// server/api/routers/invitation.ts
export const invitationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(invitation.organizationId, input.organizationId)];
      
      if (input.status) {
        conditions.push(eq(invitation.status, input.status));
      }

      return await ctx.db
        .select()
        .from(invitation)
        .where(and(...conditions));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(invitation).where(eq(invitation.id, input.id));
    }),

  resend: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the invitation
      const inv = await ctx.db
        .select()
        .from(invitation)
        .where(eq(invitation.id, input.id))
        .limit(1);

      if (!inv[0]) throw new Error("Invitation not found");

      // TODO: Implement your email resend logic here
      // For now, just update the expiresAt to extend the invitation
      await ctx.db
        .update(invitation)
        .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }) // 7 days
        .where(eq(invitation.id, input.id));
    }),
});

