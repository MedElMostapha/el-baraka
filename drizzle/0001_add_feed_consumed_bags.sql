CREATE TABLE IF NOT EXISTS `restocks` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`cost_per_chick` real NOT NULL,
	`date` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `sales` ADD `feed_consumed_bags` real DEFAULT 0 NOT NULL;
