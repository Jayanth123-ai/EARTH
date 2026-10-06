CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(240) NOT NULL,
	`powerBonus` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievements_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` varchar(36) NOT NULL,
	`userId` int,
	`eventType` varchar(60) NOT NULL,
	`summary` varchar(240) NOT NULL,
	`entityType` varchar(40),
	`entityId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_logs` (
	`id` varchar(36) NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(40) NOT NULL,
	`entityId` varchar(100) NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` varchar(500) NOT NULL,
	`kind` varchar(40) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`territoryId` varchar(36) NOT NULL,
	`amount` decimal(13,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`status` enum('PENDING','PAID','FAILED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`idempotencyKey` varchar(100) NOT NULL,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`orderId` varchar(36) NOT NULL,
	`provider` enum('RAZORPAY') NOT NULL DEFAULT 'RAZORPAY',
	`providerOrderId` varchar(100),
	`providerPaymentId` varchar(100),
	`amount` decimal(13,2) NOT NULL,
	`status` enum('CREATED','AUTHORIZED','CAPTURED','FAILED','REFUNDED') NOT NULL DEFAULT 'CREATED',
	`signatureVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_providerOrderId_unique` UNIQUE(`providerOrderId`),
	CONSTRAINT `payments_providerPaymentId_unique` UNIQUE(`providerPaymentId`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`userId` int NOT NULL,
	`identityId` varchar(16) NOT NULL,
	`username` varchar(32) NOT NULL,
	`displayName` varchar(80) NOT NULL,
	`avatarUrl` text,
	`bio` varchar(280),
	`identityLevel` enum('INITIATE','EXPLORER','CLAIMER','BUILDER','COMMANDER','LEGEND') NOT NULL DEFAULT 'INITIATE',
	`territoryPower` int NOT NULL DEFAULT 0,
	`territoryCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `profiles_identityId_unique` UNIQUE(`identityId`),
	CONSTRAINT `profiles_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `territories` (
	`id` varchar(36) NOT NULL,
	`territoryId` varchar(24) NOT NULL,
	`name` varchar(120) NOT NULL,
	`region` varchar(80) NOT NULL,
	`country` varchar(80) NOT NULL,
	`latitude` decimal(9,6) NOT NULL,
	`longitude` decimal(9,6) NOT NULL,
	`areaUnits` decimal(12,2) NOT NULL,
	`rarity` enum('COMMON','RARE','EPIC','LEGENDARY','MYTHIC') NOT NULL DEFAULT 'COMMON',
	`basePrice` decimal(13,2) NOT NULL,
	`currentPrice` decimal(13,2) NOT NULL,
	`status` enum('AVAILABLE','OWNED','LOCKED','FEATURED') NOT NULL DEFAULT 'AVAILABLE',
	`ownerId` int,
	`territoryPower` int NOT NULL DEFAULT 0,
	`historicalNote` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `territories_id` PRIMARY KEY(`id`),
	CONSTRAINT `territories_territoryId_unique` UNIQUE(`territoryId`)
);
--> statement-breakpoint
CREATE TABLE `territory_owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`orderId` varchar(36),
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `territory_owners_id` PRIMARY KEY(`id`),
	CONSTRAINT `territory_owners_territory_unique` UNIQUE(`territoryId`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementId` int NOT NULL,
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_achievements_unique` UNIQUE(`userId`,`achievementId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_accounts` (
	`userId` int NOT NULL,
	`balance` decimal(13,2) NOT NULL DEFAULT '0.00',
	`pending` decimal(13,2) NOT NULL DEFAULT '0.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_accounts_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`type` enum('PURCHASE','REFUND','CREDIT','DEBIT','BONUS','ADJUSTMENT') NOT NULL,
	`amount` decimal(13,2) NOT NULL,
	`balanceAfter` decimal(13,2) NOT NULL,
	`status` enum('PENDING','COMPLETED','REVERSED') NOT NULL DEFAULT 'COMPLETED',
	`idempotencyKey` varchar(100) NOT NULL,
	`referenceId` varchar(100),
	`memo` varchar(240),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_transactions_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_logs` ADD CONSTRAINT `admin_logs_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_territoryId_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `territories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `territories` ADD CONSTRAINT `territories_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `territories` ADD CONSTRAINT `territories_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `territory_owners` ADD CONSTRAINT `territory_owners_territoryId_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `territories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `territory_owners` ADD CONSTRAINT `territory_owners_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_achievementId_achievements_id_fk` FOREIGN KEY (`achievementId`) REFERENCES `achievements`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_accounts` ADD CONSTRAINT `wallet_accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_logs_user_created_idx` ON `activity_logs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_logs_admin_created_idx` ON `admin_logs` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_user_created_idx` ON `orders` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_territory_status_idx` ON `orders` (`territoryId`,`status`);--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`orderId`);--> statement-breakpoint
CREATE INDEX `territories_status_idx` ON `territories` (`status`);--> statement-breakpoint
CREATE INDEX `territories_rarity_idx` ON `territories` (`rarity`);--> statement-breakpoint
CREATE INDEX `territories_region_idx` ON `territories` (`region`);--> statement-breakpoint
CREATE INDEX `territories_owner_idx` ON `territories` (`ownerId`);--> statement-breakpoint
CREATE INDEX `territory_owners_user_idx` ON `territory_owners` (`userId`);--> statement-breakpoint
CREATE INDEX `wallet_transactions_user_created_idx` ON `wallet_transactions` (`userId`,`createdAt`);