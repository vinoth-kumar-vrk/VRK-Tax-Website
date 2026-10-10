# VRK Tax Solutions — website + backend (Netlify)

Static HTML/CSS/JS front end (Design A) with a serverless backend written as **Netlify Functions (JavaScript)**.
No server, PHP or SQL database is needed — it runs on Netlify's free plan. Enquiries are stored in **Netlify Blobs**.

```
public/                     published site (everything here is public)
  index, about, services, contact, service-*.html, site.css
  js/enquiry.js             form -> POST /api/enquiry
  admin/                    password-protected enquiries dashboard (/admin/)
netlify/functions/
  enquiry.mjs               POST /api/enquiry            (public)
  admin-login.mjs           POST /api/admin/login        (password -> 12h token)
  admin-enquiries.mjs       GET/PATCH/DELETE /api/admin/enquiries[/:id], ?format=csv
  lib/                      validation, storage, auth, email, http helpers
test/backend.test.mjs       12 end-to-end tests of the functions
dev-server.mjs              local preview without the Netlify CLI
netlify.toml                publish dir, functions dir, security headers
```

## What the backend does
- **Enquiry form** (Contact page + every service page): validates name / Indian mobile / optional email / service, blocks bots (hidden honeypot field), rejects cross-site posts, rate-limits to 5 per hour per visitor, saves the enquiry, optionally emails it to you.
- If the server can't be reached, the form shows a **WhatsApp / call fallback**, so a lead is never lost.
- **Admin dashboard** at `/admin/`: sign in, filter by status (new / contacted / in-progress / closed / spam), search, add notes, delete, **export CSV**. Login is brute-force limited; tokens expire after 12 hours.

## Deploy to Netlify (free)
1. Put this folder in a Git repo (GitHub/GitLab) and **Add new site → Import from Git** in Netlify. Build settings are read from `netlify.toml` (no build command; publish `public`).
   (Or drag-and-drop does **not** run functions — use Git or the Netlify CLI: `npx netlify-cli deploy --prod`.)
2. **Site configuration → Environment variables**, add:
   | Variable | Required | Purpose |
   |---|---|---|
   | `ADMIN_PASSWORD` | yes | password for `/admin/` — use a long random one |
   | `ADMIN_SECRET` | no | token signing key (defaults to the password) |
   | `RESEND_API_KEY` | no | enables email alerts ([resend.com](https://resend.com) free tier) |
   | `NOTIFY_TO` | no | where alerts go, e.g. `vrktax2024@gmail.com` |
   | `NOTIFY_FROM` | no | verified sender in Resend (default is test-only `onboarding@resend.dev`) |
3. Redeploy, open `https://<your-site>/admin/` and sign in.
4. Add the custom domain `www.vrktaxsolutions.com` under **Domain management**.

## Run locally
```
npm install
npm test            # 12 backend tests
npm run local       # http://localhost:8888  (admin password: admin123, data in ./.data)
npm run dev         # alternative: real Netlify runtime via netlify-cli
```

## Notes / limits
- Free-plan limits apply (function invocations and Blobs storage); a tax-consultant enquiry volume is far below them.
- Still to supply: real per-service document checklists and FAQs (generic text for now) and team/testimonial content.
- Previous versions are kept outside this folder: `../VRK-Website-backup-old/` (original wireframe build) and `../VRK-Website-backup-designC/` (Design C).
