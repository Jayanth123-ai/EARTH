CREATE TABLE `wallet_topup_requests` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(13,2) NOT NULL,
	`paymentReference` varchar(100) NOT NULL,
	`receiptUrl` varchar(500),
	`status` enum('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`verifiedPaymentId` varchar(100),
	`reviewedBy` int,
	`reviewNote` varchar(500),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_topup_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_topups_reference_unique` UNIQUE(`paymentReference`),
	CONSTRAINT `wallet_topups_verified_payment_unique` UNIQUE(`verifiedPaymentId`),
	CONSTRAINT `wallet_topups_positive_amount` CHECK(`wallet_topup_requests`.`amount` > 0)
);
--> statement-breakpoint
ALTER TABLE `wallet_topup_requests` ADD CONSTRAINT `wallet_topup_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_topup_requests` ADD CONSTRAINT `wallet_topup_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wallet_topups_user_created_idx` ON `wallet_topup_requests` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `wallet_topups_status_created_idx` ON `wallet_topup_requests` (`status`,`createdAt`);