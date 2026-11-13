# Hygiene Links cPanel catalog and CMS

This is the complete server-rendered Hygiene Links website and content manager.
It is configured to run as a standard Next.js Node.js application in cPanel,
with cPanel MySQL/MariaDB and local server media storage.

## Public and CMS routes

- `/` and `/index.html` — homepage
- `/catalog.html` — all main categories
- `/category/[slug].html` — editable category/subcategory pages
- `/product/[slug].html` — product details and enquiry actions
- `/about.html`, `/chairmans-message.html`, `/vision-mission.html`
- `/blog.html` and `/contact.html`
- `/sitemap.xml` and `/robots.txt`
- `/admin/login` — protected CMS sign-in
- `/admin` — products, categories, content, clients, SEO, Ads and enquiries

## cPanel services

- Node.js 22 and Passenger run `app.js`.
- MySQL stores products, category hierarchy, editable content, SEO fields,
  settings, client logos and enquiries.
- `UPLOAD_DIR` stores images uploaded through the CMS.
- CMS login uses scrypt password hashing and a signed, HttpOnly, SameSite cookie.

The database tables are created automatically when the app first connects. The
same schema is also supplied as `mysql/schema.sql` for manual phpMyAdmin import.

## Commands

```bash
npm install
npm run build
npm start
npm test
npm run cms:password
```

Copy `.env.example` values into the cPanel application's Environment Variables.
Do not upload a real `.env` file or share database/CMS credentials.

See `CPANEL-HOSTING-GUIDE.md` for staging and
`CPANEL-MAIN-SITE-LAUNCH-GUIDE.md` for the production-domain launch and
rollback procedure.
