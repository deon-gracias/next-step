import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  resident,
  residentInsertSchema,
  residentSelectSchema,
} from "@/server/db/schema";
import { and, count, eq, ilike, like, sql } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const residentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(residentInsertSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(resident).values(input);
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: residentSelectSchema.shape.id,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(resident).where(eq(resident.id, input.id));
    }),

  list: protectedProcedure
    .input(
      z.object({
        ...residentSelectSchema.partial().shape,
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(resident.id, input.id));
      if (input.name) conditions.push(ilike(resident.name, `%${input.name}%`));
      if (input.facilityId)
        conditions.push(eq(resident.facilityId, input.facilityId));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(resident)
        .where(whereClause);

      const total = totalResult?.count ?? 0;
      const totalPages = Math.ceil(total / input.pageSize);

      return {
        data: await ctx.db
          .select()
          .from(resident)
          .where(whereClause)
          .limit(input.pageSize)
          .offset(offset),
        total,
        totalPages,
      };
    }),
});
