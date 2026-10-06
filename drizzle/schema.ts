import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("app_role", ["user", "admin"]);
export const identityLevelEnum = pgEnum("identity_level", ["INITIATE", "EXPLORER", "CLAIMER", "BUILDER", "COMMANDER", "LEGEND"]);
export const rarityEnum = pgEnum("territory_rarity", ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]);
export const territoryStatusEnum = pgEnum("territory_status", ["AVAILABLE", "OWNED", "LOCKED", "FEATURED"]);
export const transactionTypeEnum = pgEnum("wallet_transaction_type", ["PURCHASE", "REFUND", "CREDIT", "DEBIT", "BONUS", "ADJUSTMENT"]);
export const transactionStatusEnum = pgEnum("wallet_transaction_status", ["PENDING", "COMPLETED", "REVERSED"]);
export const topupStatusEnum = pgEnum("wallet_topup_status", ["PENDING", "VERIFIED", "REJECTED"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["RAZORPAY"]);
export const paymentStatusEnum = pgEnum("payment_status", ["CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"]);
const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** Core Manus OAuth user table. Direct access to Supabase's Data API is blocked by RLS. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamptz("lastSignedIn").defaultNow().notNull(),
}).enableRLS();

export const profiles = pgTable("profiles", {
  userId: integer("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  identityId: varchar("identityId", { length: 16 }).notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  displayName: varchar("displayName", { length: 80 }).notNull(),
  avatarUrl: text("avatarUrl"),
  bio: varchar("bio", { length: 280 }),
  identityLevel: identityLevelEnum("identityLevel").default("INITIATE").notNull(),
  territoryPower: integer("territoryPower").default(0).notNull(),
  territoryCount: integer("territoryCount").default(0).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull(),
}).enableRLS();

export const territories = pgTable("territories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  territoryId: varchar("territoryId", { length: 24 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  region: varchar("region", { length: 80 }).notNull(),
  country: varchar("country", { length: 80 }).notNull(),
  latitude: decimal("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: decimal("longitude", { precision: 9, scale: 6 }).notNull(),
  areaUnits: decimal("areaUnits", { precision: 12, scale: 2 }).notNull(),
  rarity: rarityEnum("rarity").default("COMMON").notNull(),
  basePrice: decimal("basePrice", { precision: 13, scale: 2 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 13, scale: 2 }).notNull(),
  status: territoryStatusEnum("status").default("AVAILABLE").notNull(),
  ownerId: integer("ownerId").references(() => users.id, { onDelete: "set null" }),
  territoryPower: integer("territoryPower").default(0).notNull(),
  historicalNote: text("historicalNote"),
  createdBy: integer("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull(),
}, table => [
  index("territories_status_idx").on(table.status),
  index("territories_rarity_idx").on(table.rarity),
  index("territories_region_idx").on(table.region),
  index("territories_owner_idx").on(table.ownerId),
]).enableRLS();

/** One immutable acquisition record per territory in the MVP; no resale/transfer API is exposed. */
export const territoryOwners = pgTable("territory_owners", {
  id: serial("id").primaryKey(),
  territoryId: varchar("territoryId", { length: 36 }).notNull().references(() => territories.id, { onDelete: "restrict" }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  orderId: varchar("orderId", { length: 36 }),
  acquiredAt: timestamptz("acquiredAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("territory_owners_territory_unique").on(table.territoryId),
  index("territory_owners_user_idx").on(table.userId),
]).enableRLS();

/** Balance is a server-maintained cache; the append-only transaction table is the audit source. */
export const walletAccounts = pgTable("wallet_accounts", {
  userId: integer("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 13, scale: 2 }).default("0.00").notNull(),
  pending: decimal("pending", { precision: 13, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull(),
}).enableRLS();

export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 13, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 13, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").default("COMPLETED").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull().unique(),
  referenceId: varchar("referenceId", { length: 100 }),
  memo: varchar("memo", { length: 240 }),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [index("wallet_transactions_user_created_idx").on(table.userId, table.createdAt)]).enableRLS();

/** User-submitted Razorpay pay-link claims; credits are posted only after admin verification. */
export const walletTopupRequests = pgTable("wallet_topup_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  amount: decimal("amount", { precision: 13, scale: 2 }).notNull(),
  paymentReference: varchar("paymentReference", { length: 100 }).notNull(),
  receiptUrl: varchar("receiptUrl", { length: 500 }).notNull(),
  status: topupStatusEnum("status").default("PENDING").notNull(),
  verifiedPaymentId: varchar("verifiedPaymentId", { length: 100 }),
  reviewedBy: integer("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewNote: varchar("reviewNote", { length: 500 }),
  reviewedAt: timestamptz("reviewedAt"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("wallet_topups_reference_unique").on(table.paymentReference),
  uniqueIndex("wallet_topups_verified_payment_unique").on(table.verifiedPaymentId),
  index("wallet_topups_user_created_idx").on(table.userId, table.createdAt),
  index("wallet_topups_status_created_idx").on(table.status, table.createdAt),
  check("wallet_topups_positive_amount", sql`${table.amount} > 0`),
]).enableRLS();

export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  territoryId: varchar("territoryId", { length: 36 }).notNull().references(() => territories.id, { onDelete: "restrict" }),
  amount: decimal("amount", { precision: 13, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR").notNull(),
  status: orderStatusEnum("status").default("PENDING").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull().unique(),
  expiresAt: timestamptz("expiresAt"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull(),
}, table => [
  index("orders_user_created_idx").on(table.userId, table.createdAt),
  index("orders_territory_status_idx").on(table.territoryId, table.status),
]).enableRLS();

export const payments = pgTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("orderId", { length: 36 }).notNull().references(() => orders.id, { onDelete: "restrict" }),
  provider: paymentProviderEnum("provider").default("RAZORPAY").notNull(),
  providerOrderId: varchar("providerOrderId", { length: 100 }).unique(),
  providerPaymentId: varchar("providerPaymentId", { length: 100 }).unique(),
  amount: decimal("amount", { precision: 13, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default("CREATED").notNull(),
  signatureVerified: boolean("signatureVerified").default(false).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull(),
}, table => [index("payments_order_idx").on(table.orderId)]).enableRLS();

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: varchar("description", { length: 240 }).notNull(),
  powerBonus: integer("powerBonus").default(0).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}).enableRLS();

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: integer("achievementId").notNull().references(() => achievements.id, { onDelete: "restrict" }),
  unlockedAt: timestamptz("unlockedAt").defaultNow().notNull(),
}, table => [uniqueIndex("user_achievements_unique").on(table.userId, table.achievementId)]).enableRLS();

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  readAt: timestamptz("readAt"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [index("notifications_user_created_idx").on(table.userId, table.createdAt)]).enableRLS();

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  eventType: varchar("eventType", { length: 60 }).notNull(),
  summary: varchar("summary", { length: 240 }).notNull(),
  entityType: varchar("entityType", { length: 40 }),
  entityId: varchar("entityId", { length: 100 }),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [index("activity_logs_user_created_idx").on(table.userId, table.createdAt)]).enableRLS();

export const adminLogs = pgTable("admin_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  adminUserId: integer("adminUserId").notNull().references(() => users.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: varchar("entityId", { length: 100 }).notNull(),
  details: text("details"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [index("admin_logs_admin_created_idx").on(table.adminUserId, table.createdAt)]).enableRLS();

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Territory = typeof territories.$inferSelect;
