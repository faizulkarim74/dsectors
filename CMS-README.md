# Dsectors Site + CMS — Setup & Operations Guide

This repository is a **static marketing site** (hand-built HTML/CSS/JS) plus a
**serverless overlay CMS** and **lead capture**, designed to run on **Vercel**
(hobby/free plan).

- **Public site** — the existing `index.html` + `pages/*.html`, unchanged in design.
- **Overlay CMS** — a runtime (`js/cms-runtime.js`) applies editable overrides
  (text, images, colour, size, per-section animation) on top of the static
  markup. Nothing about the base design is destroyed; overrides live in a
  database and are layered on at load.
- **Admin dashboard** — `/admin` — password-protected visual editor + leads inbox.
- **Lead capture** — the contact form posts to `/api/leads`, which stores the
  lead **and** emails a notification.

---

## 1. Services you must create (all have free tiers)

You need three integrations. Add the first two from the Vercel dashboard so their
env vars are injected automatically.

| Purpose | Service | How |
|---|---|---|
| Content + leads database | **Upstash Redis** | Vercel → your project → **Storage** → *Marketplace* → **Upstash Redis** → connect. Injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`. |
| Image uploads | **Vercel Blob** | Vercel → **Storage** → **Blob** → create store → connect. Injects `BLOB_READ_WRITE_TOKEN`. |
| Lead email | **Resend** | Create a free account at resend.com, make an API key. Add `RESEND_API_KEY` manually. |

## 2. Environment variables

Copy `.env.example` → `.env.local` for local dev, and set the **same keys** in
Vercel (**Project → Settings → Environment Variables**). The ones you set by hand:

```
ADMIN_PASSWORD      = a strong password (this is what you type at /admin)
AUTH_SECRET         = a long random string
                      node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
RESEND_API_KEY      = re_...
LEAD_FROM_EMAIL     = onboarding@resend.dev   (or a verified sender on your domain)
LEAD_NOTIFY_EMAIL   = info@dsectors.org        (where new-lead emails go)
```

The `KV_REST_API_*` and `BLOB_READ_WRITE_TOKEN` values are injected by the Vercel
integrations above — you don't type them by hand.

> **Email note:** Resend's `onboarding@resend.dev` sender works immediately for
> testing but can only deliver to the address that owns the Resend account. To
> send to `info@dsectors.org` freely, verify the `dsectors.org` domain in Resend
> and set `LEAD_FROM_EMAIL` to something like `noreply@dsectors.org`.

## 3. Deploy

```bash
npm install          # installs @upstash/redis, @vercel/blob, resend
npx vercel           # first deploy / link project
npx vercel --prod    # production deploy
```

Or connect the Git repo in the Vercel dashboard and push — it builds automatically.
There is no build step; Vercel serves the static files and runs `/api/*` as
serverless functions.

### Local development

```bash
npm install
npx vercel dev       # serves the site + /api locally, reading .env.local
```

---

## 4. Using the CMS

1. Go to **`/admin`** and log in with `ADMIN_PASSWORD`.
2. **Design & Content tab**
   - Pick a page from the dropdown; the site loads in the preview.
   - **Click any highlighted element** to open the inspector.
   - Edit **text**, upload/replace an **image**, change **text colour**,
     **background**, **font size**, **weight**, **alignment**.
   - Click a **section** (dashed outline covers the whole band) to set its
     **entry animation** (fade/slide/zoom + duration + delay).
   - **Save changes** persists to the database; the live site reflects it on next
     load. **Discard** reverts unsaved edits. **Reset this element** removes an
     override so the element returns to its original design.
3. **Leads tab** — every contact submission appears here (newest first). Mark
   read/unread, delete, search, and **Export CSV**. You also get an email per lead.

### What's editable

Any element tagged `data-cms="<key>"` (text/image/style) and any section tagged
`data-cms-section="<key>"` (animation). The **home page and contact page are fully
instrumented** as the reference. To make more elements editable, just add a unique
`data-cms="page.area.name"` attribute in the HTML — no code changes needed. Example:

```html
<h2 class="t-h2" data-cms="clients.hero.title">50+ Institutions, One Team</h2>
<section class="clients-section" data-cms-section="clients.grid"> … </section>
```

> Richly-styled headings that contain markup (e.g. the hero `<h1>` with coloured
> highlight words) are intentionally left un-tagged for text editing, because
> replacing their text would drop the inline highlight design. Their **section
> animation** is still editable. Tag them only if you accept plain-text on edit.

---

## 5. How it works (architecture)

```
Browser ──GET /api/content──▶ Upstash Redis (content JSON)   ← admin POSTs edits
        ──POST /api/leads───▶ Upstash Redis (leads list) + Resend (email)
        ──POST /api/upload──▶ Vercel Blob (returns public image URL)
/admin  ──POST /api/login───▶ HMAC-signed session cookie (AUTH_SECRET)
```

Files:

```
api/
  _lib/store.js      Redis client + content/leads helpers
  _lib/auth.js       HMAC cookie session
  content.js         GET (public) / POST (admin) the content document
  upload.js          POST (admin) image → Vercel Blob
  leads.js           POST (public) capture lead + email · GET (admin) list
  lead-update.js     POST (admin) mark read / delete
  login.js logout.js session.js
js/cms-runtime.js    applies overrides + animations; editor bridge; form → lead
admin/               the dashboard (index.html, admin.css, admin.js)
```

## 6. Security notes

- The admin is protected by a single shared password + signed session cookie
  (12h). Use a strong `ADMIN_PASSWORD` and a long random `AUTH_SECRET`.
- `/api/content` **GET** is public (the site needs it) but only exposes content
  you chose to make editable. **POST** (writes), **upload**, and **leads GET**
  all require the session cookie.
- Cookies are `HttpOnly; Secure; SameSite=Lax`.
- For higher security later: add rate-limiting on `/api/login` and `/api/leads`,
  and move to per-user accounts.
