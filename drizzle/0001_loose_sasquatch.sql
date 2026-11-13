CREATE TABLE `seo_entries` (
	`key` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`label` text NOT NULL,
	`meta_title` text DEFAULT '' NOT NULL,
	`meta_description` text DEFAULT '' NOT NULL,
	`keywords` text DEFAULT '' NOT NULL,
	`canonical_path` text DEFAULT '' NOT NULL,
	`og_title` text DEFAULT '' NOT NULL,
	`og_description` text DEFAULT '' NOT NULL,
	`robots_index` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `seo_entries_entity_idx` ON `seo_entries` (`entity_type`,`entity_id`);