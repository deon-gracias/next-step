import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  resident,
  residentInsertSchema,
  residentSelectSchema,
} from "@/server/db/schema";
import { and, eq, like } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const assessmentRouter = createTRPCRouter({
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
      if (input.name) conditions.push(like(resident.name, `%${input.name}%`));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return await ctx.db
        .select()
        .from(resident)
        .where(whereClause)
        .limit(input.pageSize)
        .offset(offset);
    }),
});
