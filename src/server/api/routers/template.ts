import { z } from "zod";
import {
  question,
  template,
  templateInsertSchema,
  templateSelectSchema,
} from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { eq, ilike, and, sql, getTableColumns, count, sum } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const templateRouter = createTRPCRouter({
  create: protectedProcedure
    .input(templateInsertSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(template).values(input).returning();
    }),

  delete: protectedProcedure
    .input(z.object({ id: templateSelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(template).where(eq(template.id, input.id));
    }),

  byId: protectedProcedure
    .input(z.object({ id: templateSelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db
          .select()
          .from(template)
          .where(eq(template.id, input.id))
          .limit(1)
      )[0];
    }),

  list: protectedProcedure
    .input(
      z.object({
        ...templateSelectSchema.partial().shape,
        ...paginationInputSchema.shape,
        withPoints: z.boolean().default(false),
        type: z.enum(['resident', 'general', 'case']).optional(),     // add this line for type filter
        search: z.string().optional(),   // add this line for name search
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(template.id, input.id));
      if (input.search) conditions.push(ilike(template.name, `%${input.search}%`));
      if (input.type) conditions.push(eq(template.type, input.type)); 

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(template)
        .where(whereClause);

      const total = totalResult?.count ?? 0;
      const totalPages = Math.ceil(total / input.pageSize);

      return {
        data: await ctx.db
          .select({
            ...getTableColumns(template),
            questionCount: count(question.id),
            totalPoints: sum(question.points),
          })
          .from(template)
          .where(whereClause)
          .leftJoin(question, eq(template.id, question.templateId))
          .groupBy(template.id)
          .orderBy(template.id)
          .limit(input.pageSize)
          .offset(offset),
        total,
        totalPages,
      };
    }),
});
