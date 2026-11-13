# Hygiene Links legacy SEO URL deployment

This update makes the strongest previous category URL the canonical public URL. Existing `/category/...` URLs and alternate historical URLs redirect permanently to that canonical URL. The application internally rewrites the canonical `/products/...` URL to the category page, so visitors and search engines keep seeing the historical URL.

## Upload location

Extract the deployment archive directly into:

`/home/hygienelinks/hygiene-links-app`

Preserve the folders in the archive and allow these listed files to be replaced.

## Build and restart

```bash
cd /home/hygienelinks/hygiene-links-app
source /home/hygienelinks/nodevenv/hygiene-links-app/22/bin/activate
node -v
npm run build && mkdir -p tmp && touch tmp/restart.txt
```

The Node version should be 22. A successful build must finish before `tmp/restart.txt` is touched.

## Verification

```bash
curl -sS -I https://hygienelinks.com/category/brooms-and-mops.html
curl -sS -I https://hygienelinks.com/products/brooms-and-mops-uae.html
curl -sS -o /dev/null -w "HTTP status: %{http_code}\n" https://hygienelinks.com/products/brooms-and-mops-oman
curl -sS https://hygienelinks.com/sitemap.xml | grep -F '/products/brooms-and-mops-oman'
```

Expected results:

- `/category/brooms-and-mops.html` redirects to `/products/brooms-and-mops-oman`.
- `/products/brooms-and-mops-uae.html` redirects to `/products/brooms-and-mops-oman`.
- `/products/brooms-and-mops-oman` returns HTTP 200.
- The sitemap contains `/products/brooms-and-mops-oman` and not the duplicate category URL.

## Rollback

Before extraction, create a backup of the application files or use cPanel File Manager's archive function. If the build fails, do not restart the application; restore the backed-up files and keep the last successful `.next` build.
