import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, ilike, and, ne } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";
import { user, member } from "@/server/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const userRouter = createTRPCRouter({
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
        ne(user.id, session.user.id),
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
});
