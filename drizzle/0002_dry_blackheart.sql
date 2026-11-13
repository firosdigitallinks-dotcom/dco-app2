CREATE TABLE `catalog_imports` (
	`version` text PRIMARY KEY NOT NULL,
	`imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
