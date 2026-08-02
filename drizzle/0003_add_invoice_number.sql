ALTER TABLE `sales` ADD `invoice_number` text;--> statement-breakpoint
UPDATE `sales` SET `invoice_number` = 'INV-' || strftime('%Y', `date`, 'unixepoch') || '-' || upper(substr(replace(`id`, '-', ''), 1, 8));--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_number_unique` ON `sales` (`invoice_number`);