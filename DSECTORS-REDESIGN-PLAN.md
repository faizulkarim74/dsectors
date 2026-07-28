# Dsectors — Full Redesign & Build Plan

Consolidates two specs you provided: the **Site Architecture Blueprint** (nav,
pages, content) and the **Visual Design System** (colour, type, components,
animation, imagery). Sequenced into phases so each is reviewable and shippable.
The existing **overlay CMS + lead capture already built** stays working
throughout; every phase keeps/extends the `data-cms` instrumentation.

Legend: 🟢 exists today · 🟡 exists, needs rework · 🔴 new build

---

## Phase 0 — Design-system foundation (do first; everything depends on it)

Rewrite the CSS design tokens in `css/style.css` to your **exact** spec.

### Colour tokens (adopt exact hexes)
| Token | Hex | Role |
|---|---|---|
| `--teal` | `#21756D` | Primary brand · nav · links · Research/MEL |
| `--terracotta` (replaces `--coral`) | `#B85346` | Primary CTA · Gender/Humanitarian |
| `--sage` (replaces `--olive`) | `#65745B` | Climate/DRR · secondary accents |
| `--mustard` (replaces `--gold`) | `#DFB02C` | Stat callouts · Digital/AI · hover |
| `--grey-light` | `#ECECEC` | Section tints · table headers · secondary buttons |
| `--slate` | `#1A1A1A` | All body + headings (never pure black) |
| `--white` | `#FFFFFF` | 70% of surface area |

- Enforce **60-30-10**: white/grey 60, slate 30, brand accents 10.
- **Thematic colour map** applied site-wide: Teal=Research/MEL, Sage=Climate/DRR,
  Terracotta=Gender/Humanitarian, Mustard=Digital/AI. Retire the legacy
  `--blue/--violet` aliases and re-map service/badge classes to these four.
- ⚠️ **Contrast note:** Mustard `#DFB02C` fails WCAG on white for small text —
  restrict it to large stat numbers, icons, borders, and hover fills, never body
  copy or small labels. Terracotta/Teal used for CTAs meet AA for button text.

### Type scale (exact)
- Fonts: **Space Grotesk** (headings) + **Inter** (body) — already loaded.
  Add **Public Sans** as body option; add **Hind Siliguri** + **Noto Sans
  Bengali** for future Bangla content (loaded but unused until Bangla is added).
- Implement the full H1→label scale with the desktop/mobile sizes, weights,
  line-heights and letter-spacing from your table (H1 3.5rem/2.25rem, etc.).
  This means **reducing current oversized headings** to the spec.

### Geometry & spacing
- **Border radius → 4–6px** everywhere (currently 14px `--r-md`). Retire pill
  radii except true chips. New scale: `--r-xs:4px --r-sm:6px --r-md:8px`.
- **8-point spacing system**: normalise paddings/margins/gaps to 8/16/24/32/48/64.
- **12-column grid** utilities for page layouts.

### Component specs
- **Data cards:** 3px top-border accent in the thematic colour, shadow
  `0 4px 6px -1px rgba(0,0,0,.05)`, hover elevation `translateY(-4px)` + left
  border wipe 0→100% height.
- **Buttons:** Primary = Terracotta/Teal fill, white text, 6px radius, `12px 24px`.
  Secondary = transparent, 1.5px slate border, slate text.
- **Tables:** sticky `#ECECEC` header, `#E0E0E0` horizontal dividers, no vertical
  lines (used on Corporate Identity, Assignments Portfolio, Institutional grid).
- **Skeleton loaders** in `#ECECEC` for CMS-driven / filtered grids (no spinners).

**Files:** `css/style.css` (token block + typography + components + responsive),
minor knock-on edits to inline styles referencing old tokens.

---

## Phase 1 — Executive navigation 🟡→🔴

Replace the flat nav on all pages with an **executive dropdown mega-menu**:

- **Home**
- **About Us ▾** → Who We Are · Board of Directors · Our Approach & Values
- **Services ▾** → Research & Studies · MEL · GESI & Safeguards · Climate & DRR ·
  Strategic Comms · Digital Transformation & AI
- **Thematic Expertise ▾** → Health & Key Populations · Gender & GBV · Governance
  & Human Rights · WASH & Food Security · Social Inclusion
- **Institutional Experience**
- **Contact & Procurement** (Terracotta CTA button)

- Dropdowns: 200ms slide-down + fade; keyboard + mobile-accordion accessible.
- Build once as a shared markup block; apply to all pages. New JS in `main.js`
  for dropdown open/close + mobile behaviour.

**Files:** all 5 existing HTML files + new pages; `css/style.css`; `js/main.js`.

---

## Phase 2 — Home page 🟡

- **Hero:** keep tagline; add high-contrast **"Request Procurement Credentials"**
  (Terracotta) + "Explore Our Services" CTAs. Restyle to Phase-0 scale.
- **Impact Metrics Bar:** $3B+, 60M+, 50+, 35+ with mustard numbers + count-up
  (count-up already implemented — re-point to these four).
- **"Why Dsectors" 3-column:** Donor-Compliance Fluency · Access to Hard-to-Reach
  Populations · In-House Digital & AI Delivery. (Repurpose existing intro
  features.)
- **Service Matrix Overview:** the thematic-coloured grid linking to service
  anchors (exists; recolour per thematic map).
- **Institutional Familiarity Ticker:** exists 🟢 (keep; restyle).

**Files:** `index.html`, `css/style.css`.

---

## Phase 3 — New & restructured pages 🔴

| Page | Status | Contents |
|---|---|---|
| **About Us** | 🟡 split from who-we-are | Founding story, Mission/Vision, 5 Core Values with in-action definitions, **Corporate Identity legal table** (RJSC C-187290/2023, Companies Act 1994, registered office) |
| **Board of Directors** | 🟡 from who-we-are | Keep the 5 detailed profiles + modals; add **filterable Assignments Portfolio table** (UN Women climate, Bandhu SRHR, IJM CSEC baseline, etc.) |
| **Our Approach & Values** | 🟡 from home section | 5-phase horizontal timeline diagram (colour-coded stages) + **Workforce & Delivery Capacity** (8-division scale, gender-balanced enumerators, no idle overhead) |
| **Services hub + 6 lines** | 🟢 exists | Keep hub + detail sections; recolour to thematic map; ensure each service line is anchor-linked |
| **Thematic Expertise** | 🔴 new page | 9-domain interactive card grid (currently lives on clients page) — move to its own page, colour-coded |
| **Institutional Experience** | 🟡 from clients | Categorised familiarity grid (Multilaterals/UN/Bilateral+Govt/INGO+Private) + compliance disclaimer |

Each new page reuses Phase-0 components and gets `data-cms` / `data-cms-section`
instrumentation so it's editable in the CMS.

---

## Phase 4 — Contact & Procurement 🟡

- **Inquiry-Type dropdown:** RFP/Tender Invitation · Research & MEL Partnership ·
  Digital/ERP Consultation · General Inquiry (feeds the lead record — already
  captured via `service`/new `inquiryType` field → shows in CMS leads inbox).
- **Vendor Pre-Qualification callout box** (styled, prominent) with the CoI/TIN/
  VAT/M&AA/CV language.
- **Embedded Google Map** of the Motijheel office (iframe embed; no API key
  needed for basic embed).
- Direct contact block already present 🟢.

**Files:** `pages/contact.html`; `api/leads.js` (+`inquiryType` field);
`js/cms-runtime.js` (already forwards service; add inquiryType).

---

## Phase 5 — Logo system & signature animations 🔴

- ⚠️ **Blocker:** the current logo is a **raster PNG**. The "Sector Assembly"
  draw-in and 45° "Hover Spin" both need a **vector SVG** of the 8-sector wheel.
  Plan: **recreate the wheel as inline SVG** from your four active + grey sectors
  (I can build this to match), plus the "DSECTORS" wordmark as text. If you have
  the original vector/AI/SVG, providing it gives a pixel-exact result.
- **Sector Assembly (page load):** grid lines draw (0.4s) → 8 sectors fade
  clockwise (0.08s each) → wordmark slides L→R with opacity. <1.2s total.
- **Hover Spin:** navbar emblem rotates exactly 45° cw, `cubic-bezier(.4,0,.2,1)`,
  0.3s.
- Respect `prefers-reduced-motion` (skip assembly, keep static logo).

**Files:** new `images/dsectors-logo.svg` (or inline component), `css`, small JS.

---

## Phase 6 — Micro-interactions, performance, imagery, CMS finish

- Card elevation + brand-colour left-border reveal on hover (service/director).
- Dropdown/accordion 200ms transitions; skeleton loaders for CMS/filter grids.
- **Zero-layout-shift / Lighthouse:** width/height on images, `font-display`,
  defer non-critical JS, self-host or preconnect fonts.
- **Imagery guidelines** applied where photos are used: authentic field imagery,
  subtle contrast + 5% warm tint, no heavy filters, no "handshake" stock. (Needs
  you to supply real field photos; placeholders until then.)
- **Custom 1.5px-stroke SVG icons** for services/thematic areas + the 5-phase
  diagram, colour-coded to the four hexes (replaces current emoji icons — larger
  asset task; can be phased).
- **CMS re-instrumentation:** extend `data-cms`/`data-cms-section` across all new
  pages so everything remains editable + animatable from `/admin`.

---

## ✅ Decisions confirmed
- **Logo:** no vector supplied → I will **recreate the 8-sector wheel as SVG** from
  the PNG (Phase 5) to drive the assembly + hover-spin animations.
- **Icons:** build a **custom 1.5px-stroke SVG icon set** (Phase 6), colour-coded.
- **Page split:** **Yes** — split Who We Are into About Us + Board of Directors +
  Our Approach (Phase 3), updating internal links + the CMS page list.
- **Board:** **5 directors** (blueprint's "six-member" was a slip).

## ✅ Phase 0 status — DONE (this pass)
Exact-hex tokens, rgba remaps across CSS + all HTML, 4–6px radius scale, 8-pt
spacing tokens, exact type scale (H1/H2/H3/body/label), slate text, thematic
service-card component (3px top-accent + hover left-border reveal + subtle shadow).
Remaining Phases 1–6 not started.

## Cross-cutting decisions & things I need from you

1. **Emoji icons → custom SVG icons?** Current cards use emoji. Your spec wants
   1.5px-stroke SVG icons. Building a full icon set is sizeable — confirm you want
   me to produce custom SVGs (yes/later).
2. **Logo SVG:** do you have the original vector? If not, I'll recreate the wheel
   in SVG (close, not guaranteed pixel-identical).
3. **Field photography:** supply real photos, or I proceed with tasteful
   placeholders sized to spec and you swap later (via the CMS image upload).
4. **Google Map:** plain iframe embed of the Motijheel address is fine and needs
   no API key — confirm the exact address string to pin.
5. **Page split:** OK to split the single "Who We Are" page into **About Us** +
   **Board of Directors** + **Our Approach** (three URLs), updating all internal
   links + the CMS page list?

## Suggested build order
Phase 0 → 1 → 2 → 4 (quick wins on existing pages) → 3 (new pages) → 5 → 6.
Each phase is independently shippable and keeps the site + CMS working.
