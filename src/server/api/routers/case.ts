import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { cases, caseInsertSchema, caseSelectSchema } from "@/server/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const casesRouter = createTRPCRouter({
  // CREATE
  create: protectedProcedure
    .input(caseInsertSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(cases).values(input);
    }),

  // DELETE
  delete: protectedProcedure
    .input(z.object({ id: caseSelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(cases).where(eq(cases.id, input.id));
    }),

  // GET BY ID
  byId: protectedProcedure
    .input(z.object({ id: caseSelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db.select().from(cases).where(eq(cases.id, input.id)).limit(1)
      )[0];
    }),

  // LIST WITH FILTERS + PAGINATION
  list: protectedProcedure
    .input(
      z.object({
        ...caseSelectSchema.partial().shape,
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(cases.id, input.id));
      if (input.code) conditions.push(ilike(cases.code, `%${input.code}%`));
      if (input.description)
        conditions.push(ilike(cases.description, `%${input.description}%`));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return await ctx.db
        .select()
        .from(cases)
        .where(whereClause)
        .limit(input.pageSize)
        .offset(offset);
    }),
});
