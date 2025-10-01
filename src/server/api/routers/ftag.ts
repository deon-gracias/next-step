import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ftag, questionFtag } from "@/server/db/schema";
import { eq, and, count, ilike, desc, asc, getTableColumns, inArray, or } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const ftagRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        ...paginationInputSchema.shape,
        code: z.string().optional(),
        description: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      
      const conditions = [];
      
      if (input.code) conditions.push(ilike(ftag.code, `%${input.code}%`));
      if (input.description) conditions.push(ilike(ftag.description, `%${input.description}%`));
      if (input.search) {
        conditions.push(
          // Search in both code and description
          ilike(ftag.code, `%${input.search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(ftag)
        .where(whereClause);

      const total = totalResult?.count ?? 0;
      const totalPages = Math.ceil(total / input.pageSize);

      // Get paginated data
      const data = await ctx.db
        .select()
        .from(ftag)
        .where(whereClause)
        .orderBy(asc(ftag.code))
        .limit(input.pageSize)
        .offset(offset);

      return {
        data,
        total,
        totalPages,
      };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [ftagRecord] = await ctx.db
        .select()
        .from(ftag)
        .where(eq(ftag.id, input.id))
        .limit(1);

      if (!ftagRecord) {
        throw new Error("F-Tag not found");
      }

      return ftagRecord;
    }),

  create: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
        description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if code already exists
      const [existingFtag] = await ctx.db
        .select()
        .from(ftag)
        .where(eq(ftag.code, input.code))
        .limit(1);

      if (existingFtag) {
        throw new Error("F-Tag code already exists");
      }

      const [newFtag] = await ctx.db
        .insert(ftag)
        .values(input)
        .returning();

      return newFtag;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(ftag)
      .orderBy(asc(ftag.code));
  }),

  search: protectedProcedure
    .input(z.object({ 
      query: z.string().optional() 
    }))
    .query(async ({ ctx, input }) => {
      const { query } = input;
      
      let whereCondition;
      if (query && query.trim()) {
        // Search in both code and description
        whereCondition = or(
          ilike(ftag.code, `%${query.trim()}%`),
          ilike(ftag.description, `%${query.trim()}%`)
        );
      }

      return await ctx.db
        .select()
        .from(ftag)
        .where(whereCondition)
        .orderBy(asc(ftag.code))
        .limit(50); // Limit results for performance
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
        description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if code already exists for a different F-Tag
      const [existingFtag] = await ctx.db
        .select()
        .from(ftag)
        .where(and(eq(ftag.code, input.code), eq(ftag.id, input.id)))
        .limit(1);

      if (existingFtag && existingFtag.id !== input.id) {
        throw new Error("F-Tag code already exists");
      }

      const [updatedFtag] = await ctx.db
        .update(ftag)
        .set({
          code: input.code,
          description: input.description,
        })
        .where(eq(ftag.id, input.id))
        .returning();

      if (!updatedFtag) {
        throw new Error("F-Tag not found");
      }

      return updatedFtag;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // First, delete all question associations
      await ctx.db
        .delete(questionFtag)
        .where(eq(questionFtag.ftagId, input.id));

      // Then delete the F-Tag itself
      await ctx.db
        .delete(ftag)
        .where(eq(ftag.id, input.id));

      return { success: true };
    }),

    

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number().int().positive()).min(1, "At least one ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First, delete all question associations for these F-Tags
      await ctx.db
        .delete(questionFtag)
        .where(inArray(questionFtag.ftagId, input.ids));

      // Then delete the F-Tags
      await ctx.db
        .delete(ftag)
        .where(inArray(ftag.id, input.ids));

      return { count: input.ids.length };
    }),

  getUsageStats: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [usageCount] = await ctx.db
        .select({ count: count() })
        .from(questionFtag)
        .where(eq(questionFtag.ftagId, input.id));

      return {
        questionCount: usageCount?.count ?? 0,
      };
    }),
});
