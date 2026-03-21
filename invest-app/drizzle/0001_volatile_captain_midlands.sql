CREATE TABLE `price_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`upper_price` real,
	`lower_price` real,
	`upper_status` text DEFAULT 'active' NOT NULL,
	`lower_status` text DEFAULT 'active' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_alerts_symbol_unique` ON `price_alerts` (`symbol`);