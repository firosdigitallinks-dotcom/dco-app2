CREATE TABLE `client_logos` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`image_url` text NOT NULL,
	`website_url` text DEFAULT '' NOT NULL,
	`market` text DEFAULT 'UAE' NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `client_logos_published_sort_idx` ON `client_logos` (`published`,`sort_order`);