CREATE TABLE `analysis_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`content` text NOT NULL,
	`cached_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analysis_cache_symbol_unique` ON `analysis_cache` (`symbol`);
--> statement-breakpoint
CREATE TABLE `portfolio_ai_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`last_analysis` text,
	`chat_history` text DEFAULT '[]' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
