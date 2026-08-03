CREATE TABLE `sync_mutations` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`operation_type` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`error_code` text,
	`created_at` integer NOT NULL,
	`processed_at` integer
);
