import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  facility,
  resident,
  residentInsertSchema,
  residentSelectSchema,
} from "@/server/db/schema";
import {
  and,
  count,
  eq,
  getTableColumns,
  ilike,
  like,
  or,
  sql,
  inArray,
} from "drizzle-orm";
import {
  matchTypeOption,
  matchTypeOptions,
  matchTypeToDrizzleCondition,
  paginationInputSchema,
} from "@/server/utils/schema";
import { getAllowedFacilities } from "./user";

export const residentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(residentInsertSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(resident).values(input).returning();
    }),

  bulkCreate: protectedProcedure
    .input(
      z.object({
        residents: z.array(
          z.object({
            name: z.string().min(1),
            facilityId: z.number().int().positive(),
            roomId: z.string().min(1),
            pcciId: z.string().min(1), // This maps to ppci_id in your schema
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(resident).values(input.residents);
      return { count: input.residents.length };
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

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z
          .array(z.number().int().positive())
          .min(1, "At least one ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Perform the bulk delete without permission checks
      await ctx.db.delete(resident).where(inArray(resident.id, input.ids));

      return { count: input.ids.length };
    }),

  byId: protectedProcedure
    .input(z.object({ id: residentSelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        (
          await ctx.db
            .select({
              ...getTableColumns(resident),
              facility: getTableColumns(facility),
            })
            .from(resident)
            .innerJoin(facility, eq(facility.id, resident.facilityId))
            .where(eq(resident.id, input.id))
            .limit(1)
        )[0] ?? null
      );
    }),

  list: protectedProcedure
    .input(
      z.object({
        ...residentSelectSchema.partial().shape,
        ...paginationInputSchema.shape,
        matchType: matchTypeOption.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const facilities = await getAllowedFacilities(ctx);

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(resident.id, input.id));
      if (input.name !== undefined && input.pcciId !== undefined)
        conditions.push(ilike(resident.name, `%${input.name}%`));
      if (input.name !== undefined)
        conditions.push(ilike(resident.name, `%${input.name}%`));
      if (input.pcciId !== undefined)
        conditions.push(ilike(resident.pcciId, `%${input.pcciId}%`));
      if (input.facilityId)
        conditions.push(eq(resident.facilityId, input.facilityId));

      const matchTypeCondition = input.matchType
        ? (matchTypeToDrizzleCondition(input.matchType) ?? and)
        : and;

      const facilityConditions = [];
      for (const f of facilities) {
        facilityConditions.push(eq(resident.facilityId, f.id));
      }

      const whereClause =
        conditions.length > 0
          ? and(matchTypeCondition(...conditions), or(...facilityConditions))
          : or(...facilityConditions);

      console.log("Facilities", facilities);

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
