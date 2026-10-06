import { and, count, desc, eq, gt, sum } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { activityLogs, achievements, notifications, profiles, territoryOwners, territories, userAchievements, walletAccounts, walletTransactions } from "../drizzle/schema";
import { getDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";
import { walletTopupsRouter } from "./wallet-topups";

async function ensureProfile(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, user: { id: number; name: string | null }) {
  const existing = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (existing[0]) return existing[0];
  const identityId = `E616-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  const username = `member-${user.id}`;
  await db.insert(profiles).values({
    userId: user.id,
    identityId,
    username,
    displayName: (user.name?.trim() || `Member ${user.id}`).slice(0, 80),
  }).onConflictDoNothing({ target: profiles.userId });
  const created = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (!created[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not initialize your EARTH616 identity." });
  return created[0];
}

export const accountRouter = router({
  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Profile data is temporarily unavailable." });
      const profile = await ensureProfile(db, ctx.user);
      return { ...profile, email: ctx.user.email };
    }),
    update: protectedProcedure.input(z.object({
      username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
      displayName: z.string().trim().min(1).max(80),
      bio: z.string().trim().max(280).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Profile service unavailable." });
      await ensureProfile(db, ctx.user);
      try {
        await db.update(profiles).set({ username: input.username, displayName: input.displayName, bio: input.bio ?? null, updatedAt: new Date() }).where(eq(profiles.userId, ctx.user.id));
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "That username is already in use." });
      }
      const rows = await db.select().from(profiles).where(eq(profiles.userId, ctx.user.id)).limit(1);
      return rows[0];
    }),
  }),

  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Dashboard data is temporarily unavailable." });
      const profile = await ensureProfile(db, ctx.user);
      const owned = await db.select({ power: territories.territoryPower })
        .from(territoryOwners).innerJoin(territories, eq(territoryOwners.territoryId, territories.id))
        .where(eq(territoryOwners.userId, ctx.user.id));
      const territoryCount = owned.length;
      const territoryPower = owned.reduce((total, item) => total + item.power, 0);
      if (profile.territoryCount !== territoryCount || profile.territoryPower !== territoryPower) {
        await db.update(profiles).set({ territoryCount, territoryPower, updatedAt: new Date() }).where(eq(profiles.userId, ctx.user.id));
      }
      const rankRows = territoryPower > 0
        ? await db.select({ ahead: count() }).from(profiles).where(gt(profiles.territoryPower, territoryPower))
        : [];
      const activity = await db.select({ id: activityLogs.id, eventType: activityLogs.eventType, summary: activityLogs.summary, createdAt: activityLogs.createdAt })
        .from(activityLogs).where(eq(activityLogs.userId, ctx.user.id)).orderBy(desc(activityLogs.createdAt)).limit(6);
      const wallet = await db.select({ balance: walletAccounts.balance }).from(walletAccounts).where(eq(walletAccounts.userId, ctx.user.id)).limit(1);
      return {
        territoriesOwned: territoryCount,
        territoryPower,
        globalRank: territoryPower > 0 ? Number(rankRows[0]?.ahead ?? 0) + 1 : null,
        e616Balance: wallet[0]?.balance ?? "0.00",
        recentActivity: activity,
      };
    }),
  }),

  territories: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Owned territories are temporarily unavailable." });
      return db.select({
        territoryId: territories.territoryId,
        name: territories.name,
        region: territories.region,
        country: territories.country,
        rarity: territories.rarity,
        status: territories.status,
        currentPrice: territories.currentPrice,
        territoryPower: territories.territoryPower,
        acquiredAt: territoryOwners.acquiredAt,
        orderId: territoryOwners.orderId,
      }).from(territoryOwners).innerJoin(territories, eq(territoryOwners.territoryId, territories.id))
        .where(eq(territoryOwners.userId, ctx.user.id)).orderBy(desc(territoryOwners.acquiredAt)).limit(100);
    }),
  }),

  wallet: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet data is temporarily unavailable." });
      const accounts = await db.select({ balance: walletAccounts.balance, pending: walletAccounts.pending })
        .from(walletAccounts).where(eq(walletAccounts.userId, ctx.user.id)).limit(1);
      const totals = await db.select({ spent: sum(walletTransactions.amount) }).from(walletTransactions)
        .where(and(eq(walletTransactions.userId, ctx.user.id), eq(walletTransactions.type, "PURCHASE"), eq(walletTransactions.status, "COMPLETED")));
      const credits = await db.select({ received: sum(walletTransactions.amount) }).from(walletTransactions)
        .where(and(eq(walletTransactions.userId, ctx.user.id), eq(walletTransactions.type, "CREDIT"), eq(walletTransactions.status, "COMPLETED")));
      const rows = await db.select({ id: walletTransactions.id, type: walletTransactions.type, amount: walletTransactions.amount, status: walletTransactions.status, referenceId: walletTransactions.referenceId, memo: walletTransactions.memo, createdAt: walletTransactions.createdAt })
        .from(walletTransactions).where(eq(walletTransactions.userId, ctx.user.id)).orderBy(desc(walletTransactions.createdAt)).limit(50);
      return {
        balance: accounts[0]?.balance ?? "0.00",
        pending: accounts[0]?.pending ?? "0.00",
        spent: totals[0]?.spent ?? "0.00",
        received: credits[0]?.received ?? "0.00",
        transactions: rows,
        unit: "E616",
      };
    }),
    topups: walletTopupsRouter,
  }),

  achievements: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Achievement data is temporarily unavailable." });
    return db.select({ slug: achievements.slug, name: achievements.name, description: achievements.description, powerBonus: achievements.powerBonus, unlockedAt: userAchievements.unlockedAt })
      .from(userAchievements).innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, ctx.user.id)).orderBy(desc(userAchievements.unlockedAt)).limit(100);
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Notifications are temporarily unavailable." });
      return db.select({ id: notifications.id, title: notifications.title, body: notifications.body, kind: notifications.kind, readAt: notifications.readAt, createdAt: notifications.createdAt })
        .from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(100);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Notification service unavailable." });
      await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
});
