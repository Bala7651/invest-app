CREATE TABLE `quote_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`price` real,
	`prev_close` real NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`volume` real DEFAULT 0 NOT NULL,
	`change` real DEFAULT 0 NOT NULL,
	`change_pct` real DEFAULT 0 NOT NULL,
	`fetched_at` integer,
	`bid` real,
	`ask` real,
	`source` text DEFAULT 'prev_close' NOT NULL,
	`source_updated_at` integer,
	`freshness_state` text DEFAULT 'fresh' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quote_cache_symbol_unique` ON `quote_cache` (`symbol`);
