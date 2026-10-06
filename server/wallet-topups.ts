import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  activityLogs,
  adminLogs,
  notifications,
  profiles,
  walletAccounts,
  walletTopupRequests,
  walletTransactions,
} from "../drizzle/schema";
import { getDb } from "./db";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";

const amountToCents = (amount: string) => Math.round(Number(amount) * 100);
const centsToAmount = (cents: number) => (cents / 100).toFixed(2);
const duplicateKey = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; cause?: { code?: string } };
  return value.code === "ER_DUP_ENTRY" || value.code === "23505" || value.cause?.code === "ER_DUP_ENTRY" || value.cause?.code === "23505";
};

export const walletTopupSubmitSchema = z.object({
  amount: z.number().finite().min(1).max(9_999_999.99),
  paymentReference: z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/),
  receiptUrl: z.string().trim().min(1).max(500).url().refine(value => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "Receipt links must use HTTPS."),
});

export const walletTopupReviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["VERIFY", "REJECT"]),
  verifiedPaymentId: z.string().trim().regex(/^pay_[A-Za-z0-9]+$/).optional(),
  reviewNote: z.string().trim().max(500).optional(),
}).superRefine((input, context) => {
  if (input.decision === "VERIFY" && !input.verifiedPaymentId) {
    context.addIssue({ code: "custom", path: ["verifiedPaymentId"], message: "Enter the official Razorpay payment ID checked in the Razorpay dashboard." });
  }
});

export const walletTopupsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet top-up history is temporarily unavailable." });
    return db.select({
      id: walletTopupRequests.id,
      amount: walletTopupRequests.amount,
      paymentReference: walletTopupRequests.paymentReference,
      receiptUrl: walletTopupRequests.receiptUrl,
      status: walletTopupRequests.status,
      verifiedPaymentId: walletTopupRequests.verifiedPaymentId,
      reviewNote: walletTopupRequests.reviewNote,
      createdAt: walletTopupRequests.createdAt,
      reviewedAt: walletTopupRequests.reviewedAt,
    }).from(walletTopupRequests).where(eq(walletTopupRequests.userId, ctx.user.id))
      .orderBy(desc(walletTopupRequests.createdAt)).limit(25);
  }),

  submit: protectedProcedure.input(walletTopupSubmitSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet top-up service is temporarily unavailable." });
    const requestId = randomUUID();
    const amount = input.amount.toFixed(2);
    try {
      await db.transaction(async tx => {
        // Lock one stable row per user before counting: simultaneous requests
        // now serialize through this wallet account before the rate checks.
        await tx.insert(walletAccounts).values({ userId: ctx.user.id, balance: "0.00", pending: "0.00" })
          .onConflictDoNothing({ target: walletAccounts.userId });
        const pendingRows = await tx.select({ total: count() }).from(walletTopupRequests)
          .where(and(eq(walletTopupRequests.userId, ctx.user.id), eq(walletTopupRequests.status, "PENDING")));
        if (Number(pendingRows[0]?.total ?? 0) >= 5) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You already have five top-up requests awaiting review." });
        }
        const recentWindow = new Date(Date.now() - 15 * 60 * 1000);
        const recentRows = await tx.select({ total: count() }).from(walletTopupRequests)
          .where(and(eq(walletTopupRequests.userId, ctx.user.id), gte(walletTopupRequests.createdAt, recentWindow)));
        if (Number(recentRows[0]?.total ?? 0) >= 5) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "For your security, you can submit up to five payment claims every 15 minutes." });
        }
        await tx.update(walletAccounts)
          .set({ pending: sql`${walletAccounts.pending} + ${amount}`, updatedAt: new Date() })
          .where(eq(walletAccounts.userId, ctx.user.id));
        await tx.insert(walletTopupRequests).values({
          id: requestId,
          userId: ctx.user.id,
          amount,
          paymentReference: input.paymentReference,
          receiptUrl: input.receiptUrl,
        });
        await tx.insert(activityLogs).values({
          id: randomUUID(),
          userId: ctx.user.id,
          eventType: "WALLET_TOPUP_SUBMITTED",
          summary: `Submitted an E616 wallet top-up request for ₹${amount}; awaiting manual Razorpay verification.`,
          entityType: "wallet_topup",
          entityId: requestId,
        });
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      if (duplicateKey(error)) throw new TRPCError({ code: "CONFLICT", message: "That payment reference has already been submitted." });
      throw error;
    }
    return { success: true as const, id: requestId, status: "PENDING" as const };
  }),
});

export const adminWalletTopupsRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet top-up review data is temporarily unavailable." });
    return db.select({
      id: walletTopupRequests.id,
      userId: walletTopupRequests.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      amount: walletTopupRequests.amount,
      paymentReference: walletTopupRequests.paymentReference,
      receiptUrl: walletTopupRequests.receiptUrl,
      status: walletTopupRequests.status,
      verifiedPaymentId: walletTopupRequests.verifiedPaymentId,
      reviewNote: walletTopupRequests.reviewNote,
      createdAt: walletTopupRequests.createdAt,
      reviewedAt: walletTopupRequests.reviewedAt,
    }).from(walletTopupRequests).leftJoin(profiles, eq(walletTopupRequests.userId, profiles.userId))
      .orderBy(desc(walletTopupRequests.createdAt)).limit(100);
  }),

  review: adminProcedure.input(walletTopupReviewSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet top-up review is temporarily unavailable." });
    try {
      return await db.transaction(async tx => {
        const requests = await tx.select().from(walletTopupRequests)
          .where(eq(walletTopupRequests.id, input.requestId)).limit(1).for("update");
        const request = requests[0];
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Top-up request not found." });
        if (request.status !== "PENDING") throw new TRPCError({ code: "CONFLICT", message: "This top-up request has already been reviewed." });

        if (input.decision === "VERIFY") {
          const duplicates = await tx.select({ id: walletTopupRequests.id }).from(walletTopupRequests)
            .where(eq(walletTopupRequests.verifiedPaymentId, input.verifiedPaymentId!)).limit(1);
          if (duplicates[0]) throw new TRPCError({ code: "CONFLICT", message: "That Razorpay payment ID has already been credited." });
        }

        await tx.insert(walletAccounts).values({ userId: request.userId, balance: "0.00", pending: "0.00" })
          .onConflictDoNothing({ target: walletAccounts.userId });
        const accounts = await tx.select({ balance: walletAccounts.balance, pending: walletAccounts.pending })
          .from(walletAccounts).where(eq(walletAccounts.userId, request.userId)).limit(1).for("update");
        const account = accounts[0];
        if (!account) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet account could not be locked for review." });
        const requestCents = amountToCents(request.amount);
        const pendingCents = amountToCents(account.pending);
        if (pendingCents < requestCents) throw new TRPCError({ code: "CONFLICT", message: "Pending wallet totals are inconsistent; no credit was issued." });
        const balanceCents = amountToCents(account.balance);
        const nextBalance = input.decision === "VERIFY" ? balanceCents + requestCents : balanceCents;
        const nextPending = pendingCents - requestCents;
        const now = new Date();

        await tx.update(walletAccounts).set({ balance: centsToAmount(nextBalance), pending: centsToAmount(nextPending), updatedAt: now })
          .where(eq(walletAccounts.userId, request.userId));

        if (input.decision === "VERIFY") {
          await tx.insert(walletTransactions).values({
            id: randomUUID(),
            userId: request.userId,
            type: "CREDIT",
            amount: request.amount,
            balanceAfter: centsToAmount(nextBalance),
            status: "COMPLETED",
            idempotencyKey: `manual-topup:${request.id}`,
            referenceId: input.verifiedPaymentId!,
            memo: `Razorpay wallet top-up · ${request.paymentReference}`,
          });
        }

        const status = input.decision === "VERIFY" ? "VERIFIED" as const : "REJECTED" as const;
        await tx.update(walletTopupRequests).set({
          status,
          verifiedPaymentId: input.decision === "VERIFY" ? input.verifiedPaymentId! : null,
          reviewedBy: ctx.user.id,
          reviewNote: input.reviewNote ?? null,
          reviewedAt: now,
          updatedAt: now,
        }).where(eq(walletTopupRequests.id, request.id));

        const description = input.decision === "VERIFY"
          ? `Verified ₹${request.amount} E616 wallet top-up against Razorpay payment ${input.verifiedPaymentId}.`
          : `Rejected the ₹${request.amount} E616 top-up request after manual Razorpay review.`;
        await tx.insert(adminLogs).values({
          id: randomUUID(), adminUserId: ctx.user.id,
          action: input.decision === "VERIFY" ? "WALLET_TOPUP_VERIFIED" : "WALLET_TOPUP_REJECTED",
          entityType: "wallet_topup", entityId: request.id,
          details: `${description}${input.reviewNote ? ` Note: ${input.reviewNote}` : ""}`,
        });
        await tx.insert(notifications).values({
          id: randomUUID(), userId: request.userId,
          title: input.decision === "VERIFY" ? "E616 top-up verified" : "E616 top-up request reviewed",
          body: input.decision === "VERIFY"
            ? `Your ₹${request.amount} E616 wallet top-up was verified and credited.`
            : `Your ₹${request.amount} E616 wallet top-up request was not approved. ${input.reviewNote ?? "Please contact an administrator if you need help."}`,
          kind: input.decision === "VERIFY" ? "WALLET_TOPUP_VERIFIED" : "WALLET_TOPUP_REJECTED",
        });
        await tx.insert(activityLogs).values({
          id: randomUUID(), userId: request.userId,
          eventType: input.decision === "VERIFY" ? "WALLET_TOPUP_VERIFIED" : "WALLET_TOPUP_REJECTED",
          summary: description,
          entityType: "wallet_topup", entityId: request.id,
        });
        return { success: true as const, status, amount: request.amount };
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      if (duplicateKey(error)) throw new TRPCError({ code: "CONFLICT", message: "That payment reference or Razorpay payment ID is already in use." });
      throw error;
    }
  }),
});
