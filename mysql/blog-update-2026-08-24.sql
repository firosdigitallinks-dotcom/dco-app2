SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS blog_posts (
  id VARCHAR(100) PRIMARY KEY,
  slug VARCHAR(191) NOT NULL,
  legacy_slug VARCHAR(191) NOT NULL,
  source_url VARCHAR(512) NULL,
  source_hash VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(500) NOT NULL,
  excerpt TEXT NOT NULL,
  body_html LONGTEXT NOT NULL,
  featured_image_url VARCHAR(1000) NOT NULL,
  image_alt VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL DEFAULT 'Hygiene Links',
  category VARCHAR(100) NOT NULL DEFAULT 'Insights',
  tags TEXT NOT NULL,
  published_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY blog_posts_slug_unique (slug),
  UNIQUE KEY blog_posts_legacy_slug_unique (legacy_slug),
  UNIQUE KEY blog_posts_source_url_unique (source_url),
  KEY blog_posts_status_date_idx (status, published_at),
  KEY blog_posts_featured_sort_idx (featured, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
