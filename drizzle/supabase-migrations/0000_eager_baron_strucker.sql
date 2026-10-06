CREATE TYPE "public"."identity_level" AS ENUM('INITIATE', 'EXPLORER', 'CLAIMER', 'BUILDER', 'COMMANDER', 'LEGEND');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('RAZORPAY');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."territory_rarity" AS ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');--> statement-breakpoint
CREATE TYPE "public"."app_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."territory_status" AS ENUM('AVAILABLE', 'OWNED', 'LOCKED', 'FEATURED');--> statement-breakpoint
CREATE TYPE "public"."wallet_topup_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_status" AS ENUM('PENDING', 'COMPLETED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('PURCHASE', 'REFUND', 'CREDIT', 'DEBIT', 'BONUS', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(40) NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" varchar(240) NOT NULL,
	"powerBonus" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer,
	"eventType" varchar(60) NOT NULL,
	"summary" varchar(240) NOT NULL,
	"entityType" varchar(40),
	"entityId" varchar(100),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"adminUserId" integer NOT NULL,
	"action" varchar(80) NOT NULL,
	"entityType" varchar(40) NOT NULL,
	"entityId" varchar(100) NOT NULL,
	"details" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" varchar(500) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"territoryId" varchar(36) NOT NULL,
	"amount" numeric(13, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"idempotencyKey" varchar(100) NOT NULL,
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_idempotencyKey_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"orderId" varchar(36) NOT NULL,
	"provider" "payment_provider" DEFAULT 'RAZORPAY' NOT NULL,
	"providerOrderId" varchar(100),
	"providerPaymentId" varchar(100),
	"amount" numeric(13, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"signatureVerified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_providerOrderId_unique" UNIQUE("providerOrderId"),
	CONSTRAINT "payments_providerPaymentId_unique" UNIQUE("providerPaymentId")
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"userId" integer PRIMARY KEY NOT NULL,
	"identityId" varchar(16) NOT NULL,
	"username" varchar(32) NOT NULL,
	"displayName" varchar(80) NOT NULL,
	"avatarUrl" text,
	"bio" varchar(280),
	"identityLevel" "identity_level" DEFAULT 'INITIATE' NOT NULL,
	"territoryPower" integer DEFAULT 0 NOT NULL,
	"territoryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_identityId_unique" UNIQUE("identityId"),
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "territories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"territoryId" varchar(24) NOT NULL,
	"name" varchar(120) NOT NULL,
	"region" varchar(80) NOT NULL,
	"country" varchar(80) NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"areaUnits" numeric(12, 2) NOT NULL,
	"rarity" "territory_rarity" DEFAULT 'COMMON' NOT NULL,
	"basePrice" numeric(13, 2) NOT NULL,
	"currentPrice" numeric(13, 2) NOT NULL,
	"status" "territory_status" DEFAULT 'AVAILABLE' NOT NULL,
	"ownerId" integer,
	"territoryPower" integer DEFAULT 0 NOT NULL,
	"historicalNote" text,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territories_territoryId_unique" UNIQUE("territoryId")
);
--> statement-breakpoint
ALTER TABLE "territories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "territory_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"territoryId" varchar(36) NOT NULL,
	"userId" integer NOT NULL,
	"orderId" varchar(36),
	"acquiredAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "territory_owners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"achievementId" integer NOT NULL,
	"unlockedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "app_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wallet_accounts" (
	"userId" integer PRIMARY KEY NOT NULL,
	"balance" numeric(13, 2) DEFAULT '0.00' NOT NULL,
	"pending" numeric(13, 2) DEFAULT '0.00' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wallet_topup_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"amount" numeric(13, 2) NOT NULL,
	"paymentReference" varchar(100) NOT NULL,
	"receiptUrl" varchar(500) NOT NULL,
	"status" "wallet_topup_status" DEFAULT 'PENDING' NOT NULL,
	"verifiedPaymentId" varchar(100),
	"reviewedBy" integer,
	"reviewNote" varchar(500),
	"reviewedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_topups_positive_amount" CHECK ("wallet_topup_requests"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "wallet_topup_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "wallet_transaction_type" NOT NULL,
	"amount" numeric(13, 2) NOT NULL,
	"balanceAfter" numeric(13, 2) NOT NULL,
	"status" "wallet_transaction_status" DEFAULT 'COMPLETED' NOT NULL,
	"idempotencyKey" varchar(100) NOT NULL,
	"referenceId" varchar(100),
	"memo" varchar(240),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_transactions_idempotencyKey_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "wallet_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_adminUserId_users_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_territoryId_territories_id_fk" FOREIGN KEY ("territoryId") REFERENCES "public"."territories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territories" ADD CONSTRAINT "territories_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territories" ADD CONSTRAINT "territories_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_owners" ADD CONSTRAINT "territory_owners_territoryId_territories_id_fk" FOREIGN KEY ("territoryId") REFERENCES "public"."territories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territory_owners" ADD CONSTRAINT "territory_owners_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_achievements_id_fk" FOREIGN KEY ("achievementId") REFERENCES "public"."achievements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_topup_requests" ADD CONSTRAINT "wallet_topup_requests_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_topup_requests" ADD CONSTRAINT "wallet_topup_requests_reviewedBy_users_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_user_created_idx" ON "activity_logs" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "admin_logs_admin_created_idx" ON "admin_logs" USING btree ("adminUserId","createdAt");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "orders_territory_status_idx" ON "orders" USING btree ("territoryId","status");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "territories_status_idx" ON "territories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "territories_rarity_idx" ON "territories" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX "territories_region_idx" ON "territories" USING btree ("region");--> statement-breakpoint
CREATE INDEX "territories_owner_idx" ON "territories" USING btree ("ownerId");--> statement-breakpoint
CREATE UNIQUE INDEX "territory_owners_territory_unique" ON "territory_owners" USING btree ("territoryId");--> statement-breakpoint
CREATE INDEX "territory_owners_user_idx" ON "territory_owners" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_achievements_unique" ON "user_achievements" USING btree ("userId","achievementId");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_topups_reference_unique" ON "wallet_topup_requests" USING btree ("paymentReference");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_topups_verified_payment_unique" ON "wallet_topup_requests" USING btree ("verifiedPaymentId");--> statement-breakpoint
CREATE INDEX "wallet_topups_user_created_idx" ON "wallet_topup_requests" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "wallet_topups_status_created_idx" ON "wallet_topup_requests" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "wallet_transactions_user_created_idx" ON "wallet_transactions" USING btree ("userId","createdAt");