CREATE TABLE `blog_posts` (
	`id` varchar(100) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`legacy_slug` varchar(191) NOT NULL,
	`source_url` varchar(512),
	`source_hash` varchar(64) NOT NULL,
	`title` varchar(500) NOT NULL,
	`excerpt` text NOT NULL,
	`body_html` longtext NOT NULL,
	`featured_image_url` varchar(1000) NOT NULL,
	`image_alt` varchar(500) NOT NULL,
	`author` varchar(255) NOT NULL DEFAULT 'Hygiene Links',
	`category` varchar(100) NOT NULL DEFAULT 'Insights',
	`tags` text NOT NULL,
	`published_at` datetime,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`featured` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `blog_posts_legacy_slug_unique` UNIQUE(`legacy_slug`),
	CONSTRAINT `blog_posts_source_url_unique` UNIQUE(`source_url`)
);
--> statement-breakpoint
CREATE TABLE `catalog_imports` (
	`version` varchar(191) NOT NULL,
	`imported_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_imports_version` PRIMARY KEY(`version`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`description` text NOT NULL,
	`parent_id` varchar(100),
	`image_url` varchar(1000) NOT NULL,
	`accent` varchar(30) NOT NULL DEFAULT 'blue',
	`featured` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `client_logos` (
	`id` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`image_url` varchar(1000) NOT NULL,
	`website_url` varchar(1000) NOT NULL,
	`market` varchar(30) NOT NULL DEFAULT 'UAE',
	`published` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `client_logos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_blocks` (
	`key` varchar(191) NOT NULL,
	`label` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`group_name` varchar(100) NOT NULL DEFAULT 'home',
	`input_type` varchar(30) NOT NULL DEFAULT 'text',
	`sort_order` int NOT NULL DEFAULT 0,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `content_blocks_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` varchar(100) NOT NULL,
	`product_id` varchar(100),
	`product_name` varchar(255) NOT NULL DEFAULT 'General enquiry',
	`name` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(80) NOT NULL,
	`message` text NOT NULL,
	`market` varchar(30) NOT NULL DEFAULT 'UAE',
	`channel` varchar(30) NOT NULL DEFAULT 'website',
	`status` varchar(30) NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`sku` varchar(100) NOT NULL,
	`category_id` varchar(100) NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`image_url` varchar(1000) NOT NULL,
	`pack_size` varchar(300) NOT NULL,
	`applications` text NOT NULL,
	`featured` boolean NOT NULL DEFAULT false,
	`eco` boolean NOT NULL DEFAULT false,
	`status` varchar(20) NOT NULL DEFAULT 'published',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `seo_entries` (
	`key` varchar(191) NOT NULL,
	`entity_type` varchar(20) NOT NULL,
	`entity_id` varchar(100) NOT NULL,
	`label` varchar(255) NOT NULL,
	`meta_title` varchar(255) NOT NULL,
	`meta_description` text NOT NULL,
	`keywords` text NOT NULL,
	`canonical_path` varchar(1000) NOT NULL,
	`og_title` varchar(255) NOT NULL,
	`og_description` text NOT NULL,
	`robots_index` boolean NOT NULL DEFAULT true,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `seo_entries_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` varchar(191) NOT NULL,
	`label` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE INDEX `blog_posts_status_date_idx` ON `blog_posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `blog_posts_featured_sort_idx` ON `blog_posts` (`featured`,`sort_order`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `categories_sort_idx` ON `categories` (`sort_order`);--> statement-breakpoint
CREATE INDEX `client_logos_published_sort_idx` ON `client_logos` (`published`,`sort_order`);--> statement-breakpoint
CREATE INDEX `inquiries_created_idx` ON `inquiries` (`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_sort_idx` ON `products` (`sort_order`);--> statement-breakpoint
CREATE INDEX `seo_entries_entity_idx` ON `seo_entries` (`entity_type`,`entity_id`);