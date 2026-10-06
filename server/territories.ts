import { and, asc, count, desc, eq, gte, gt, like, lte, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { profiles, territories } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

const raritySchema = z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]);
const statusSchema = z.enum(["AVAILABLE", "OWNED", "LOCKED", "FEATURED"]);
const filterSchema = z.object({
  search: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  rarity: raritySchema.optional(),
  status: statusSchema.optional(),
  minPrice: z.number().min(0).max(1_000_000_000).optional(),
  maxPrice: z.number().min(0).max(1_000_000_000).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "power"]).default("newest"),
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(50).default(24),
});

export const territoriesRouter = router({
  list: publicProcedure.input(filterSchema.optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Territory data is temporarily unavailable." });
    const f = filterSchema.parse(input ?? {});
    const clauses = [];
    if (f.search) {
      const term = `%${f.search.replace(/[\\%_]/g, "\\$&")}%`;
      clauses.push(or(like(territories.name, term), like(territories.territoryId, term), like(territories.country, term))!);
    }
    if (f.region) clauses.push(like(territories.region, `%${f.region}%`));
    if (f.rarity) clauses.push(eq(territories.rarity, f.rarity));
    if (f.status) clauses.push(eq(territories.status, f.status));
    if (f.minPrice !== undefined) clauses.push(gte(territories.currentPrice, f.minPrice.toFixed(2)));
    if (f.maxPrice !== undefined) clauses.push(lte(territories.currentPrice, f.maxPrice.toFixed(2)));
    const where = clauses.length ? and(...clauses) : undefined;
    const limit = f.limit ?? 24;
    const page = f.page ?? 1;
    const orderBy = f.sort === "price-asc" ? asc(territories.currentPrice)
      : f.sort === "price-desc" ? desc(territories.currentPrice)
      : f.sort === "power" ? desc(territories.territoryPower)
      : desc(territories.createdAt);
    const items = await db.select({
        id: territories.id,
        territoryId: territories.territoryId,
        name: territories.name,
        region: territories.region,
        country: territories.country,
        rarity: territories.rarity,
        status: territories.status,
        areaUnits: territories.areaUnits,
        territoryPower: territories.territoryPower,
        currentPrice: territories.currentPrice,
        latitude: territories.latitude,
        longitude: territories.longitude,
        createdAt: territories.createdAt,
      }).from(territories).where(where).orderBy(orderBy).limit(limit).offset((page - 1) * limit);
    const totals = await db.select({ total: count() }).from(territories).where(where);
    return { items, total: totals[0]?.total ?? 0, page, limit };
  }),

  get: publicProcedure.input(z.object({ territoryId: z.string().trim().min(1).max(24) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Territory data is temporarily unavailable." });
    const rows = await db.select({
      id: territories.id,
      territoryId: territories.territoryId,
      name: territories.name,
      region: territories.region,
      country: territories.country,
      latitude: territories.latitude,
      longitude: territories.longitude,
      areaUnits: territories.areaUnits,
      rarity: territories.rarity,
      basePrice: territories.basePrice,
      currentPrice: territories.currentPrice,
      status: territories.status,
      ownerId: territories.ownerId,
      territoryPower: territories.territoryPower,
      historicalNote: territories.historicalNote,
      createdAt: territories.createdAt,
      updatedAt: territories.updatedAt,
    }).from(territories).where(eq(territories.territoryId, input.territoryId)).limit(1);
    const territory = rows[0];
    if (!territory) throw new TRPCError({ code: "NOT_FOUND", message: "That digital territory could not be found." });
    let owner: { username: string; displayName: string } | null = null;
    if (territory.ownerId) {
      const ownerRows = await db.select({ username: profiles.username, displayName: profiles.displayName })
        .from(profiles).where(eq(profiles.userId, territory.ownerId)).limit(1);
      owner = ownerRows[0] ?? null;
    }
    const { ownerId: _privateOwnerId, ...publicTerritory } = territory;
    return { ...publicTerritory, owner };
  }),

  rankings: publicProcedure.input(z.object({ category: z.enum(["power", "territories"]).default("power"), limit: z.number().int().min(1).max(50).default(20) }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Rankings are temporarily unavailable." });
    const category = input?.category ?? "power";
    const orderBy = category === "territories" ? desc(profiles.territoryCount) : desc(profiles.territoryPower);
    const minimum = category === "territories" ? gt(profiles.territoryCount, 0) : gt(profiles.territoryPower, 0);
    const rows = await db.select({
      identityId: profiles.identityId,
      username: profiles.username,
      displayName: profiles.displayName,
      identityLevel: profiles.identityLevel,
      territoryPower: profiles.territoryPower,
      territoryCount: profiles.territoryCount,
    }).from(profiles).where(minimum).orderBy(orderBy, asc(profiles.username)).limit(input?.limit ?? 20);
    return { category, entries: rows };
  }),

  /** Catalog mutation is intentionally admin-only; public clients cannot set prices or ownership. */
  adminCreate: adminProcedure.input(z.object({
    territoryId: z.string().trim().regex(/^E616-[0-9]{6}$/),
    name: z.string().trim().min(2).max(120),
    region: z.string().trim().min(2).max(80),
    country: z.string().trim().min(2).max(80),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    areaUnits: z.number().positive().max(1_000_000_000),
    rarity: raritySchema,
    price: z.number().positive().max(1_000_000_000),
    status: z.enum(["AVAILABLE", "FEATURED", "LOCKED"]).default("AVAILABLE"),
    historicalNote: z.string().trim().max(2000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    try {
      await db.insert(territories).values({
        id,
        territoryId: input.territoryId,
        name: input.name,
        region: input.region,
        country: input.country,
        latitude: input.latitude.toFixed(6),
        longitude: input.longitude.toFixed(6),
        areaUnits: input.areaUnits.toFixed(2),
        rarity: input.rarity,
        basePrice: input.price.toFixed(2),
        currentPrice: input.price.toFixed(2),
        status: input.status,
        createdBy: ctx.user.id,
        historicalNote: input.historicalNote ?? null,
      });
      const { adminLogs } = await import("../drizzle/schema");
      await db.insert(adminLogs).values({
        id: randomUUID(), adminUserId: ctx.user.id, action: "TERRITORY_CREATED",
        entityType: "territory", entityId: id, details: `Created ${input.territoryId}`,
      });
      return { id, territoryId: input.territoryId };
    } catch {
      throw new TRPCError({ code: "CONFLICT", message: "Territory could not be created. Verify its ID is unique and try again." });
    }
  }),

  adminSetStatus: adminProcedure.input(z.object({ territoryId: z.string().trim().min(1).max(24), status: z.enum(["AVAILABLE", "FEATURED", "LOCKED"]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const rows = await db.select({ id: territories.id, ownerId: territories.ownerId }).from(territories).where(eq(territories.territoryId, input.territoryId)).limit(1);
    const territory = rows[0];
    if (!territory) throw new TRPCError({ code: "NOT_FOUND", message: "Territory not found." });
    if (territory.ownerId) throw new TRPCError({ code: "CONFLICT", message: "Owned territories cannot be unlocked or relabeled as available." });
    await db.update(territories).set({ status: input.status, updatedAt: new Date() }).where(eq(territories.id, territory.id));
    const { randomUUID } = await import("node:crypto");
    const { adminLogs } = await import("../drizzle/schema");
    await db.insert(adminLogs).values({ id: randomUUID(), adminUserId: ctx.user.id, action: "TERRITORY_STATUS_CHANGED", entityType: "territory", entityId: territory.id, details: input.status });
    return { success: true };
  }),
});
