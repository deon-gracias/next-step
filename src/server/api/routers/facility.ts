import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  facility,
  facilityInsertSchema,
  facilitySelectSchema,
} from "@/server/db/schema";
import { and, count, eq, ilike, like, sql } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const facilityRouter = createTRPCRouter({
  create: protectedProcedure
    .input(facilityInsertSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(facility).values(input);
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: facilitySelectSchema.shape.id,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(facility).where(eq(facility.id, input.id));
    }),

  byId: protectedProcedure
    .input(
      z.object({
        id: facilitySelectSchema.shape.id,
      }),
    )
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db
          .select()
          .from(facility)
          .where(eq(facility.id, input.id))
          .limit(1)
      )[0];
    }),

  list: protectedProcedure
    .input(
      z.object({
        ...facilitySelectSchema.partial().shape,
        ...paginationInputSchema.shape,
        showAll: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(facility.id, input.id));
      if (input.name) conditions.push(ilike(facility.name, `%${input.name}%`));
      if (input.facilityCode)
        conditions.push(
          ilike(facility.facilityCode, `%${input.facilityCode}%`),
        );
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      if (input.showAll == true) {
        console.log("Fetching all facilities without pagination");
        const data = await ctx.db.select().from(facility).where(whereClause);

        return {
          data,
          total: data.length,
          totalPages: 1,
        };
      }

      // Use pagination for normal requests
      const offset = (input.page - 1) * input.pageSize;

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(facility)
        .where(whereClause);

      const total = totalResult?.count ?? 0;
      const totalPages = Math.ceil(total / input.pageSize);

      return {
        data: await ctx.db
          .select()
          .from(facility)
          .where(whereClause)
          .limit(input.pageSize)
          .offset(offset),
        total,
        totalPages,
      };
    }),
});
