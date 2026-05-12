CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`breed` text,
	`arrival_date` integer NOT NULL,
	`initial_quantity` integer NOT NULL,
	`cost_per_chick` real NOT NULL,
	`feed_stock` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text
);
--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`date` integer NOT NULL,
	`mortality` integer DEFAULT 0 NOT NULL,
	`feed_consumed` real DEFAULT 0 NOT NULL,
	`water_consumed` real DEFAULT 0 NOT NULL,
	`medications` text,
	`notes` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`person_name` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`date` integer NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`paid_date` integer
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`amount` real NOT NULL,
	`unit_price` real,
	`quantity` real,
	`category` text NOT NULL,
	`description` text,
	`batch_id` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`last_updated` integer
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`sale_id` text,
	`date` integer NOT NULL,
	`amount` real NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`client_id` text,
	`date` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
