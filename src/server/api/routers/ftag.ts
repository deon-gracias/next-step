import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ftag, ftagInsertSchema, ftagSelectSchema } from "@/server/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const ftagRouter = createTRPCRouter({
  // CREATE
  create: protectedProcedure
    .input(ftagInsertSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(ftag).values(input);
    }),

  // DELETE
  delete: protectedProcedure
    .input(z.object({ id: ftagSelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(ftag).where(eq(ftag.id, input.id));
    }),

  // GET BY ID
  byId: protectedProcedure
    .input(z.object({ id: ftagSelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db.select().from(ftag).where(eq(ftag.id, input.id)).limit(1)
      )[0];
    }),

  // LIST WITH FILTERS + PAGINATION
  list: protectedProcedure
    .input(
      z.object({
        ...ftagSelectSchema.partial().shape,
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(ftag.id, input.id));
      if (input.code) conditions.push(ilike(ftag.code, `%${input.code}%`));
      if (input.description)
        conditions.push(ilike(ftag.description, `%${input.description}%`));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return await ctx.db
        .select()
        .from(ftag)
        .where(whereClause)
        .limit(input.pageSize)
        .offset(offset);
    }),
});
