-- Update Google Search Console verification code
UPDATE site_settings
SET value = 'RaAzq6JSBe41dVSgbY8_xdiBZrZjvZb_Jav1z7e2k7c', updated_at = CURRENT_TIMESTAMP
WHERE `key` = 'google_site_verification' AND (value = '' OR value = '#');

INSERT IGNORE INTO catalog_imports (version)
VALUES ('google-site-verification-2026-10-17-v1');
