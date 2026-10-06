import { count, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  adminLogs,
  notifications,
  orders,
  payments,
  territories,
  users,
  walletTopupRequests,
  walletTransactions,
} from "../drizzle/schema";
import { getDb } from "./db";
import { adminProcedure, router } from "./_core/trpc";
import { adminWalletTopupsRouter } from "./wallet-topups";

const unavailable = (message: string) => new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });

export const adminRouter = router({
  overview: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("Admin data is temporarily unavailable.");
    const userTotal = await db.select({ total: count() }).from(users);
    const territoryTotal = await db.select({ total: count() }).from(territories);
    const orderTotal = await db.select({ total: count() }).from(orders);
    const transactionTotal = await db.select({ total: count() }).from(walletTransactions);
    const paymentTotal = await db.select({ total: count() }).from(payments);
    const topupTotal = await db.select({ total: count() }).from(walletTopupRequests);
    return {
      users: userTotal[0]?.total ?? 0,
      territories: territoryTotal[0]?.total ?? 0,
      orders: orderTotal[0]?.total ?? 0,
      payments: paymentTotal[0]?.total ?? 0,
      ledgerEntries: transactionTotal[0]?.total ?? 0,
      walletTopups: topupTotal[0]?.total ?? 0,
    };
  }),
  users: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("User data is temporarily unavailable.");
    return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, joinedAt: users.createdAt, lastSignedIn: users.lastSignedIn })
      .from(users).orderBy(desc(users.createdAt)).limit(100);
  }),
  territories: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("Territory data is temporarily unavailable.");
    return db.select({ territoryId: territories.territoryId, name: territories.name, region: territories.region, rarity: territories.rarity, status: territories.status, currentPrice: territories.currentPrice, territoryPower: territories.territoryPower, updatedAt: territories.updatedAt })
      .from(territories).orderBy(desc(territories.updatedAt)).limit(100);
  }),
  orders: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("Order data is temporarily unavailable.");
    return db.select({ id: orders.id, userId: orders.userId, territoryId: orders.territoryId, amount: orders.amount, currency: orders.currency, status: orders.status, createdAt: orders.createdAt })
      .from(orders).orderBy(desc(orders.createdAt)).limit(100);
  }),
  payments: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("Payment data is temporarily unavailable.");
    return db.select({ id: payments.id, orderId: payments.orderId, provider: payments.provider, providerOrderId: payments.providerOrderId, providerPaymentId: payments.providerPaymentId, amount: payments.amount, status: payments.status, signatureVerified: payments.signatureVerified, createdAt: payments.createdAt, updatedAt: payments.updatedAt })
      .from(payments).orderBy(desc(payments.createdAt)).limit(100);
  }),
  walletTopups: adminWalletTopupsRouter,
  ledger: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("Wallet ledger data is temporarily unavailable.");
    return db.select({ id: walletTransactions.id, userId: walletTransactions.userId, type: walletTransactions.type, amount: walletTransactions.amount, balanceAfter: walletTransactions.balanceAfter, status: walletTransactions.status, referenceId: walletTransactions.referenceId, memo: walletTransactions.memo, createdAt: walletTransactions.createdAt })
      .from(walletTransactions).orderBy(desc(walletTransactions.createdAt)).limit(100);
  }),
  reports: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("Report data is temporarily unavailable.");
    const usersByRole = await db.select({ label: users.role, total: count() }).from(users).groupBy(users.role);
    const territoriesByStatus = await db.select({ label: territories.status, total: count() }).from(territories).groupBy(territories.status);
    const ordersByStatus = await db.select({ label: orders.status, total: count() }).from(orders).groupBy(orders.status);
    const paymentsByStatus = await db.select({ label: payments.status, total: count() }).from(payments).groupBy(payments.status);
    const walletTopupsByStatus = await db.select({ label: walletTopupRequests.status, total: count() }).from(walletTopupRequests).groupBy(walletTopupRequests.status);
    return { usersByRole, territoriesByStatus, ordersByStatus, paymentsByStatus, walletTopupsByStatus };
  }),
  audit: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw unavailable("Audit history is temporarily unavailable.");
    return db.select({ id: adminLogs.id, adminUserId: adminLogs.adminUserId, action: adminLogs.action, entityType: adminLogs.entityType, entityId: adminLogs.entityId, details: adminLogs.details, createdAt: adminLogs.createdAt })
      .from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(100);
  }),
  updatePrice: adminProcedure.input(z.object({
    territoryId: z.string().trim().min(1).max(24),
    price: z.number().positive().max(1_000_000_000),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw unavailable("Database unavailable.");
    return db.transaction(async tx => {
      const rows = await tx.select({ id: territories.id, ownerId: territories.ownerId, status: territories.status })
        .from(territories).where(eq(territories.territoryId, input.territoryId)).limit(1);
      const territory = rows[0];
      if (!territory) throw new TRPCError({ code: "NOT_FOUND", message: "Territory not found." });
      if (territory.ownerId || territory.status === "OWNED") throw new TRPCError({ code: "CONFLICT", message: "Owned territories cannot be repriced." });
      const currentPrice = input.price.toFixed(2);
      await tx.update(territories).set({ currentPrice, updatedAt: new Date() }).where(eq(territories.id, territory.id));
      await tx.insert(adminLogs).values({
        id: randomUUID(), adminUserId: ctx.user.id, action: "TERRITORY_PRICE_CHANGED",
        entityType: "territory", entityId: territory.id,
        details: `Updated ${input.territoryId} current price to ${currentPrice} INR.`,
      });
      return { success: true, currentPrice };
    });
  }),
  announce: adminProcedure.input(z.object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(3).max(500),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw unavailable("Database unavailable.");
    return db.transaction(async tx => {
      const recipients = await tx.select({ id: users.id }).from(users).limit(1001);
      if (recipients.length > 1000) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "This broadcast exceeds the current 1,000-account batch limit." });
      const rows = recipients.map(user => ({
        id: randomUUID(), userId: user.id, title: input.title, body: input.body,
        kind: "ANNOUNCEMENT", readAt: null,
      }));
      for (let offset = 0; offset < rows.length; offset += 200) {
        await tx.insert(notifications).values(rows.slice(offset, offset + 200));
      }
      await tx.insert(adminLogs).values({
        id: randomUUID(), adminUserId: ctx.user.id, action: "ANNOUNCEMENT_SENT",
        entityType: "announcement", entityId: randomUUID(),
        details: `Sent ${input.title} to ${recipients.length} account(s).`,
      });
      return { success: true, recipients: recipients.length };
    });
  }),
});
