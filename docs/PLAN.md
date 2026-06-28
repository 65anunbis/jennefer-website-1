# Jennefer Wong — Website Functional Specification

## Context

This plan captures the full scope of the Jennefer Wong website (`jenneferwong.sg`), built from a planning conversation with the business owner. The goal is to produce a production-ready business website for a Singapore-based therapy practice offering hypnotherapy and tarot clarity services. The site must support client acquisition (via WhatsApp booking), regular blog publishing, and an admin dashboard for managing bookings and clients.

---

## 1. Business Overview

| Field | Detail |
|---|---|
| Practitioner / Business name | Jennefer Wong |
| Location | Singapore (in-person, face-to-face) |
| Services | Hypnotherapy, Tarot Clarity |
| Target audience | Locals in Singapore (Phase 1); online/global clients (Phase 2) |
| Booking channel | WhatsApp chat (click-to-chat from website) |
| Practitioner's device | iPhone (admin panel must be mobile-responsive) |
| Domain (this project) | `jenneferwong.sg` (already registered) |

**Two-site setup:**
- **`jenneferwong.com`** — a separate, design-led site built and hosted on Wix. The owner is designing the look & feel herself here, with no application functionality. This is where the final visual identity will be defined.
- **`jenneferwong.sg`** — this project. Starts as a basic site with the full application functionality (booking, admin panel, blog, etc. — see below). At a later stage, the visual design from `jenneferwong.com` will be ported over to this project (see Section 2).

**End state:** `jenneferwong.sg` becomes the canonical, final site — the full application with the replicated design. Once Jennefer is satisfied with the look & feel on `jenneferwong.sg`, `jenneferwong.com` is repointed to redirect (301) to `jenneferwong.sg` via Vercel's multi-domain support (one Vercel project, both domains attached, `.com` set to redirect to the `.sg` primary domain) — so all client traffic converges on `jenneferwong.sg`.

---

## 2. Design Direction (Phase 1 placeholder)

This section describes a **placeholder design** for the initial build — enough to make the site presentable and testable while the application functionality is built out. The actual visual identity will be designed separately by the owner on `jenneferwong.com` (via Wix) and ported over to this project later.

- **Aesthetic**: Soft & healing — warm cream/off-white backgrounds, sage green and dusty mauve accents
- **Typography**: Clean sans-serif (e.g. DM Sans or Inter for body; light serif like Playfair Display for headings)
- **Mood**: Nurturing, grounded, approachable, professional
- **Content assets available**: Professional photos, written bio, service descriptions — usable regardless of final visual design

**Design replication (later phase):** once `jenneferwong.com` is built, inspect it to extract a design system (colors, typography, spacing, component styles) and rebuild that visual language in this project's Tailwind config + components. This only affects the presentation layer — the data model, admin logic, and booking flow are unaffected. (See Section 15, Open Items.)

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + API routes + React; ideal for this use case |
| Database | PostgreSQL (hosted on Neon) | As specified by the owner; Neon free tier is sufficient |
| ORM | Prisma | Type-safe, clean migrations |
| Styling | Tailwind CSS | Utility-first; fast to iterate |
| Admin auth | NextAuth.js | Username/password; supports multiple admin users with role-based access |
| Blog editor | Tiptap | Rich text editor, embeds natively in the admin panel |
| WhatsApp | `wa.me` click-to-chat | No API needed; pre-formatted template message |
| Calendar | Google Calendar API | Phase 1 — write-only mirror; bookings (and calendar blocks) created in admin panel are pushed to GCal for visibility on practitioner's iPhone |
| Hosting | Vercel | To be set up later; free tier suits this project |

### What each layer does & cost

| Layer | What it does | Cost |
|---|---|---|
| Next.js | The engine — runs the entire website (public pages + admin panel) | Free |
| PostgreSQL (Neon) | The filing cabinet — stores all data: clients, bookings, blog posts, testimonials | Free (Neon free tier, up to 0.5GB) |
| Prisma | Translates between the app and the database; manages table structure | Free |
| Tailwind CSS | Styles the website (colours, spacing, layout) — invisible to visitors | Free |
| NextAuth.js | Handles admin panel login (username + password) | Free |
| Tiptap | The blog editor embedded in the admin panel — similar to Google Docs | Free |
| Google Calendar API | Pushes bookings from the admin panel to your Google Calendar (visible on your iPhone) | Free (generous quota) |
| Vercel | Hosts the website — serves pages when visitors load your URL | Free (Hobby plan) |
| **Domain name** | `jenneferwong.sg` (already registered) — your web address | ~$30–50/year (only real ongoing cost) |

---

## 4. Environments & Deployment Strategy

Three environments — **dev**, **uat**, and **main (production)** — each with its own git branch, database branch, and deployment target.

| Tier | Git branch | Vercel | Neon DB branch | Data |
|---|---|---|---|---|
| **Dev** | `dev` (+ short-lived feature branches) | Local `next dev`; Vercel auto-generates a preview for `dev` too, but it's optional/unused unless useful for sharing | `dev` | Synthetic seed data only — never refreshed from prod |
| **UAT** | `uat` | Pinned Preview deployment (stable URL) | `uat` | Periodically refreshed from `main` via Neon "reset from parent," then anonymized |
| **Prod** | `main` | Production deployment (live site) | `main` | Real client data, full PDPA controls apply |

**Flow:** feature branches → `dev` → `uat` → `main`

**Database strategy (Neon branching):**
- One Neon project with three branches: `main` (root/prod), `dev`, `uat` — copy-on-write, so branches don't multiply storage usage until data diverges
- `dev`: seeded once via `prisma db seed` with made-up clients, bookings, packages, etc.; safe to wipe and re-seed at any time
- `uat`: before a testing cycle, reset from `main` (Neon "reset from parent") to get realistic data shape/volume, then run an anonymization script that overwrites PII fields (client `name`, `whatsapp_number`, `email`, `session_notes.content`) with synthetic placeholders while preserving IDs, relationships, dates, and statuses — so testing is realistic without exposing real client data
- `main`: untouched real data; normal PDPA-driven access controls apply (see Section 10, Audit Log)

**Hosting strategy (Vercel):**
- One Vercel project connected to the GitHub repo
- `main` branch → Production deployment
- `uat` branch → pinned Preview deployment, used as the stable UAT environment
- `dev` branch / local machine → local `next dev` is the primary dev environment, connected to the Neon `dev` branch via `.env.local`

**Region — everything in Singapore (set 2026-06-20):** to co-locate compute with the database and the (Singapore) audience, the Vercel **Function/runtime region is set to `sin1` (Singapore)** for all environments — Production, Preview-uat, and Preview-dev — via the Vercel dashboard (Settings → Functions → Function Region; Hobby allows one region). This eliminates the previous trans-Pacific hop where US-East (`iad1`) functions queried the Singapore DB. The matching **Neon branches `dev`/`uat`/`main` all run in AWS Singapore `ap-southeast-1`.** Note: the *build* region in deploy logs may still show a US city — that's only where CI runs and is irrelevant to runtime latency. The choice was NOT pinned in `vercel.json` (redundant with the dashboard setting, and not the canonical mechanism for Next.js — avoids two sources of truth). Revisit only if Phase 2 brings a global audience (multi-region serving is Pro+).

**Environment variables:** each Vercel environment (Production, and the Preview deployments for `uat` and `dev`) holds its own `DATABASE_URL` pointing at the matching Neon branch.

**Per-environment env-var status & `NEXTAUTH_URL` reminder:**
- **dev (Preview)** — `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` set ✅; admin login verified working on the Preview URL. `NEXTAUTH_URL` intentionally left unset (per-push preview URL changes; NextAuth falls back to `VERCEL_URL`).
- **uat (Preview)** — `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` set ✅. ⚠️ **TODO:** UAT needs a **pinned/stable preview URL** (per §4 hosting strategy); once that pinned URL exists, set **`NEXTAUTH_URL` = that pinned UAT URL** and redeploy. Also apply the Prisma migration to the Neon `uat` branch before first login.
- **prod (Production)** — `NEXTAUTH_SECRET` set ✅. ⚠️ **TODO (part of the DNS/domain task):** after `jenneferwong.sg` DNS is pointed at Vercel and the domain resolves, set **`NEXTAUTH_URL` = `https://jenneferwong.sg`** and redeploy. Also set `DATABASE_URL`/`DIRECT_URL` for the Neon `main` branch and apply the migration there. Until DNS is live, leave `NEXTAUTH_URL` unset (falls back to `VERCEL_URL`).

**Open item:** Vercel Hobby vs Pro plan decision — see Section 15 (Open Items).

---

## 5. Services & Pricing

### Hypnotherapy
| Package | Format | Duration | Price (SGD) |
|---|---|---|---|
| 1 session (trial) | Face-to-face | 60 min | $150 |
| 3 sessions (10% off) | Face-to-face | 60 min | $405 |
| 6 sessions (15% off) | Face-to-face | 60 min | $765 |

### Tarot Clarity
| Package | Format | Duration | Price (SGD) |
|---|---|---|---|
| 1 session | Face-to-face | 60 min | $100 |
| 1 session | Zoom | 60 min | $70 |
| 1 session | Zoom | 30 min | $40 |

*All pricing is tentative and editable by admin.*

---

## 6. Pages

### Public Pages

| Page | Key Content |
|---|---|
| **Homepage** | Hero section with tagline + CTA, services summary cards, about teaser, "Book via Chat" CTA |
| **About Me** | Practitioner bio, credentials, therapeutic approach, photo |
| **Services** | Full service descriptions and pricing tables for both services |
| **Testimonials** | All client testimonials; each card shows client name, service, and quote; managed via admin |
| **Blog** | Post listing (with excerpts, dates, categories); individual post pages |
| **Contact** | "Book via Chat" button, WhatsApp link, location info (area/district, not full address unless desired) |
| **Privacy Policy** | PDPA privacy notice — what personal data is collected (name, WhatsApp, email, session context), why, how it's stored/secured, retention, and how to request access/correction. Static page; linked from the footer. Basically required for a Singapore site collecting personal data (decided 2026-06-20). |

### Admin Pages (password-protected, `/admin`)

| Page | Key Functions |
|---|---|
| **Dashboard** | Upcoming bookings/blocks at a glance + quick actions (links into the Bookings calendar); **SOD overdue-bookings banner** (past `confirmed` bookings awaiting an outcome, §7) — *Admin + Staff* |
| **Bookings** | Month→day **calendar view** (per-day booking-count badge; working-hours white/pink shading) + add/edit/delete bookings — venue **or** Zoom delivery, duration, session-consumption (hard-block on exhausted package), ~~GCal sync~~ (GCal deferred — §12), soft overlap warning; **EOD processing** (resolve today's outcomes + send tomorrow's reminders); also manage **calendar blocks** (vacation/training/etc.) here — *Admin + Staff* |
| **Clients** | Client directory; name, WhatsApp, email, booking history, general notes — *Admin + Staff*; package purchases & session consumption (sessions used/remaining per package) — *Admin + Staff*; session notes — *Admin only*; session notes can be linked to a specific booking or standalone |
| **Blog Editor** | Create/edit posts (Tiptap rich text), set cover image, publish/unpublish, schedule publish date — *Admin + Staff* |
| **Testimonials** | Add/edit/show-hide testimonials (client name, service, quote) — *Admin + Staff* |
| **Services** | Edit service names, descriptions, and pricing (no redeploy needed) — *Admin only* |
| **Venues** | Add/edit/deactivate session venues (one seeded default); used by in-person bookings — *Admin only* |
| **Business Hours** | Edit recurring weekly working hours (drives the calendar's cosmetic white/pink shading) — *Admin only* |
| **User Management** | Add/edit/deactivate admin panel users; assign roles (admin \| staff) — *Admin only* |
| **Audit Log** | Read-only view of all admin panel actions; filterable by actor, resource type, and date range — *Admin only* |

---

## 7. Booking Flow

All bookings originate from the admin panel. The database is the single source of truth.

**Existing client, package has sessions remaining:**
```
Customer chats via WhatsApp → Practitioner confirms date/time
  → Practitioner logs into /admin → Bookings → Add Booking
  → Selects existing client
  → Admin panel shows the client's active packages with sessions remaining,
      sorted oldest purchase first
      (e.g. "Hypnotherapy 3-session — purchased 15 Jan 2026 — 1 remaining")
  → Practitioner selects the package to consume from (oldest pre-selected, can override)
  → Selects date/time, venue or Zoom delivery, duration, notes
  → Booking record saved to PostgreSQL, linked to that client_package
  → Admin panel pushes a Google Calendar event via API (mirror for iPhone visibility)
```

**Existing client, buying a new package:**
```
Client decides to buy a new package (e.g. another 3-session hypnotherapy)
  → Practitioner logs into /admin → Clients → [Client] → Add Package Purchase
  → Selects package type; purchased date + price paid default from the catalog
      and are editable
  → New client_packages record created (sessions_total snapshot from catalog)
  → Practitioner proceeds to Add Booking → selects this new package → date/time, venue/delivery, duration, notes
  → Booking record saved to PostgreSQL, linked to that client_package
  → Admin panel pushes a Google Calendar event via API
```

**New client:**
```
Customer is new → Practitioner logs into /admin → Clients → Add New Client
  → Enters name, WhatsApp number, optional email + notes → client record created
  → Success screen offers: "Record Package Purchase for [Client Name]?" (shortcut button)
  → Practitioner clicks it → selects package type, purchased date, price paid
      → client_packages record created
  → Success screen offers: "Add Booking for [Client Name]?" (shortcut button)
  → Practitioner clicks it → Add Booking form opens with client + package pre-populated
  → Selects date/time, venue or Zoom delivery, duration, notes
  → Booking record saved to PostgreSQL, linked to that client_package
  → Admin panel pushes a Google Calendar event via API
  (Practitioner can also skip the shortcuts and add a package/booking later)
```

**Editing / deleting:**
- Edits made in admin panel update both the PostgreSQL record and the mirrored Google Calendar event via API
- Deleting a booking in the admin panel removes both the DB record and the Google Calendar event, and frees up the session on the linked package (`sessions_remaining` increases again)
- Events added directly in Google Calendar are not tracked — all bookings must originate from the admin panel

**No-show & reinstatement:**
- If a client doesn't turn up and gives no advance notice, admin marks the booking status as `no_show` — the session stays counted as consumed against the client's package (no change to `sessions_remaining`); this enforces the default no-show policy
- If the client later requests the session be reinstated, admin **edits the same booking**: changes status back to `confirmed` and updates `scheduled_date`/`scheduled_time` to the newly agreed slot, with a note in `booking_notes` (e.g. *"No-show 20 Jan; rescheduled to 21 Jan per client's request"*)
- This is a normal booking edit — no extra session is deducted from the package, and the mirrored Google Calendar event moves to the new date/time automatically

**Venue / delivery selection (Step 4):** the booking form captures `delivery_type` (in_person | zoom) on the booking itself (a snapshot, defaulting from the linked package) and shows **one of two fields accordingly (XOR)**:
- **in_person → a venue picker (required).** Venues live in a `venues` table (§8); Phase 1 seeds **one placeholder venue** (a fake office address — *"Jennefer Wong Therapy, 100 Cecil Street #12-01, Singapore 069532"* — until the real one is supplied), pre-selected. The venue's name/address is pushed to the mirrored GCal event's `location` field. Adding more venues later is pure data entry — no code change.
- **zoom → a Zoom join-link field.** Phase 1 = **manual arrangement**: Jennefer sorts the Zoom session out with the client directly, so `bookings.zoom_join_url` defaults to the text **"to arrange manually"** (editable — she can paste a real link per booking if she has one); **no Zoom API**. The Zoom confirmation message says she'll arrange the link, and only embeds an actual URL when one has been entered (it never sends the "to arrange manually" placeholder as if it were a link). *(Phase 2 — §15 — the Zoom API auto-assigns a unique join URL into this same field per booking, full link not a bare id. We **build the field/seam now** so Phase 2 is purely additive.)*

**Blocks — non-client calendar time (Step 4):** Jennefer can block out time that isn't a client session — **vacation, training, team event, personal, public holiday, other** — stored in a separate `calendar_blocks` table (§8), NOT in `bookings` (keeps the session model clean: no client, no package, no session math). Blocks can be all-day and multi-day (a vacation) or timed (a 9am–1pm training). `block_type` is an enum + a free-text `title`; "other" + title covers anything unusual (so the enum rarely needs new values). Blocks also push to the mirrored GCal calendar so they show on her iPhone alongside sessions.

**Availability — viewed in the admin panel, DB-sourced (Step 4):** she never has to consult Google Calendar to see what's free — GCal is a write-only phone mirror and can have gaps (a failed push leaves a booking in the DB but not on the phone). The **database is the source of truth**, and the admin panel answers availability from it by unioning bookings + blocks:
- **Month → day calendar view** (`/admin/bookings`, default) — the planning surface. Each day cell shows a **booking-count badge** (total bookings that date so she can scan the month's load at a glance) plus any blocks (a multi-day block renders as a banner across its span); click a day → a day view laid out by time; click a free slot → the Add-Booking form opens with date/time **pre-filled**. This subsumes the dashboard's "upcoming bookings at a glance" (§6).
  - The count is **all non-cancelled bookings on that date**, INCLUDING out-of-hours ad-hoc sessions (working hours only affect cosmetic shading, never what counts as a booking); cancelled bookings are excluded so the number reflects what actually occupies the day.
- **Working-hours shading (cosmetic, Step 4).** The day/week view shades **working hours white and non-working hours light pink** (from the `business_hours` table, §8) so out-of-hours slots are visually obvious — but it's **purely cosmetic, NEVER enforced**: Jennefer can still take an ad-hoc out-of-hours booking. The **month grid** (no time axis) can at most lightly mark fully-closed days (e.g. Sunday). The day view's visible window **expands to include any out-of-hours bookings** so they're never hidden. Seed hours: Mon–Fri 09:00–18:00, Sat 09:00–13:00, Sun off (SGT); admin-editable. Public holidays / one-off closures are `calendar_blocks` drawn on top, not hours edits.
- **Inline overlap warning** — when she picks a date/time, the form checks the DB for overlapping bookings/blocks and warns (e.g. *"⚠ Overlaps block: 'Bali trip'"* or *"⚠ 2–3pm already booked: Amanda"*). It is a **soft warning with override** — she may deliberately double-book or keep buffers. All times are SGT, so the overlap math is trivial.
- Built as a **custom, lightweight** calendar (no heavy library like FullCalendar / react-big-calendar — their mobile responsiveness is poor and the admin panel must work on her **iPhone**); the per-month dataset is small.

**Session consumption & overbooking (Step 4):** booking against a package decrements its computed `sessions_remaining` (§8). When a package is **exhausted (sessions_remaining = 0)**, the Add-Booking form **hard-blocks** booking against it (decided 2026-06-20) — the practitioner must pick another package or record the booking as ad-hoc (no `client_package_id`). The package's `status` is **not** auto-flipped to `completed` — it stays `active` at 0 remaining until someone marks it complete by hand.

**Daily processing — EOD / SOD (Step 4, decided 2026-06-20):** bookings don't self-resolve, so resolution is a deliberate human habit, surfaced as a self-healing queue in the admin panel (no cron / background job — purely UI-driven, fits Vercel serverless):
> **Scope note (2026-06-28):** since the Google Calendar write-API is **deferred** (§12), the **GCal-retry step of EOD/SOD is NOT built in the current phase.** EOD/SOD ships with outcome-resolution + day-before reminders only; the GCal retry sweep (and the per-booking "Retry calendar sync" button) come back if/when the write-API is switched on.
- **EOD (End-of-Day) processing** — a screen listing *today's* `confirmed` bookings, prompting the practitioner to flip each to **completed / cancelled / no_show**. The same screen then lists *tomorrow's* bookings with a one-tap **"Send reminder"** `wa.me` button each (the day-before reminder, §11). EOD is thus: resolve today's outcomes → send tomorrow's reminders → *(deferred: retry any failed GCal pushes — `gcal_sync_failures`, §12)*.
- **SOD (Start-of-Day) safety net** — if EOD was missed, the next day's first panel view shows a **banner/queue of overdue bookings** (any `confirmed` booking with `scheduled_date < today`) asking staff to resolve them. If an outcome must be confirmed with Jennefer first, staff can **skip and open for business** — the booking simply re-surfaces in the next SOD sweep until resolved. The net is **self-healing**: we never track "did EOD run"; any unresolved past `confirmed` booking keeps reappearing until acted on.

**Client notifications (Phase 1):** after a booking is created / rescheduled / cancelled, the admin booking screen shows a one-tap **"Send confirmation to client"** `wa.me` button (pre-filled message to the client's number, sent from the business number — she taps send). A **day-before reminder** `wa.me` button is offered during EOD for tomorrow's bookings (above). **No-shows are NOT messaged** (pre-paid; slot forfeited — deliberate). **Fallback for non-WhatsApp clients:** the same screen also offers **copy buttons** — copy the client's phone number (in dial-friendly `+65…` form), copy their email (shown only when `email` is non-null), and copy the confirmation message (the same template reused as plain text) — so staff can quickly fall back to manual SMS or email. See §11 for the mechanic and per-status table.

The "Book via Chat" button appears in: site header (desktop nav), mobile menu, homepage hero, services page, contact page.

**Key principle:** The database (PostgreSQL) is the single source of truth. Google Calendar is a write-only mirror — events are pushed to it so the practitioner can see appointments on their iPhone, but the admin panel never reads events from Google Calendar to discover bookings.

---

## 8. Database Schema (PostgreSQL via Prisma)

```
services          — id, name, slug, description, image_url,
                     active BOOLEAN, created_at, updated_at

service_packages  — id, service_id, name, price_sgd DECIMAL(10,2),
                     duration_minutes, sessions_count,
                     delivery_type (in_person | zoom), description,
                     active BOOLEAN, created_at, updated_at

venues            — id, name, address?, color?, is_default BOOLEAN,
                     active BOOLEAN, sort_order INT, notes?,
                     created_at, updated_at
                     (physical locations for in-person sessions; Phase 1 seeds ONE
                      default venue (Jennefer's Singapore location), pre-selected in
                      the booking form; a booking's venue_id → venues.id; the venue's
                      name/address is pushed to the mirrored GCal event's `location`
                      field; venues are GROWING data Jennefer manages herself — hence a
                      table, not an enum; adding more venues later is pure data entry,
                      no code change)

clients           — id, name, whatsapp_number, email, notes, additional_id?,
                     created_at, updated_at
                     (notes = general context about the client, e.g. preferences,
                      referral source, background — persists across all sessions;
                      additional_id = optional government-issued ID for future use:
                      NRIC, Employment Pass, or Passport number; nullable for now;
                      CLIENTS ARE NEVER DELETED (decided 2026-06-20) — no delete UI, no
                      soft-delete/anonymize-in-place; the RESTRICT FKs from bookings/
                      packages/session_notes already make a hard delete impossible, and
                      we deliberately keep the full client history)

client_packages   — id, client_id FK → clients.id, package_id FK → service_packages.id,
                     sessions_total INT, price_paid_sgd DECIMAL(10,2),
                     purchased_date DATE, status (active | completed | cancelled),
                     paid BOOLEAN default false, payment_mode (paynow | bank_transfer |
                     cash | credit_card) default paynow, paid_date DATE?,
                     created_by FK → admin_users.id,
                     notes, created_at, updated_at
                     (records a client's purchase of a package, e.g. "3-session
                      hypnotherapy"; sessions_total and price_paid_sgd are snapshots
                      taken at purchase time — later changes to service_packages don't
                      retroactively alter past purchases; sessions_remaining =
                      sessions_total minus count of non-cancelled bookings linked to
                      this record — computed, not stored; status: active = sessions
                      remain, completed = all sessions used, cancelled = refunded/voided;
                      STATUS NEVER AUTO-FLIPS (decided 2026-06-20) — even when
                      sessions_remaining hits 0 the package stays `active` until someone
                      sets `completed` by hand; instead, booking against an EXHAUSTED
                      package is HARD-BLOCKED (sessions_remaining = 0 → the Add-Booking
                      form refuses that package; pick another package, or record a NEW
                      package purchase first — NEW bookings must consume a package
                      (ad-hoc creation disabled, decided 2026-06-28, see §15));
                      PAYMENT is recorded here, not in service_packages (which is the
                      price-list catalog): paid = has the client paid yet; payment_mode
                      defaults to paynow (Singapore norm); paid_date = when payment
                      cleared (nullable until paid); created_by = which admin/staff
                      recorded the purchase. Payments stay OFFLINE in Phase 1 — no online
                      gateway; partial payments/deposits not modelled (boolean only).
                      Online payment is a future expansion if the business grows.)

bookings          — id, gcal_event_id, client_id, client_package_id?,
                     venue_id?, zoom_join_url?, delivery_type (in_person | zoom),
                     scheduled_date DATE, scheduled_time TIME, duration_minutes INT,
                     status (confirmed | completed | cancelled | no_show),
                     booking_notes, created_at, updated_at
                     (client_package_id links this booking to a specific package
                      purchase, consuming one session from it; nullable in the schema,
                      but NEW bookings must set it — the New-booking form requires a
                      package and offers no ad-hoc option (decided 2026-06-28, §15); the
                      Edit form still allows clearing it so legacy/ad-hoc bookings stay
                      editable;
                      delivery_type is a SNAPSHOT — defaults from the linked package,
                      editable for ad-hoc bookings; it decides which field applies (XOR):
                      in_person requires venue_id (zoom_join_url null); zoom requires
                      zoom_join_url (venue_id null);
                      the XOR is ENFORCED AT THE DB LEVEL via a raw-SQL CHECK constraint
                      (decided 2026-06-20, in addition to app/form validation): roughly
                      CHECK ((delivery_type='in_person' AND venue_id IS NOT NULL AND
                      zoom_join_url IS NULL) OR (delivery_type='zoom' AND zoom_join_url
                      IS NOT NULL AND venue_id IS NULL)) — fail-loud, makes a malformed
                      booking impossible to write even outside the app;
                      venue_id FK → venues.id, nullable (in-person bookings only);
                      zoom_join_url — Phase 1: Jennefer arranges the Zoom session with
                      the client manually, so this defaults to the text "to arrange
                      manually" (editable — she MAY paste a real link per booking if she
                      has one); no Zoom API. Phase 2: the Zoom API auto-assigns a unique
                      join URL here per zoom booking (§15). Store the full join link
                      (embeds meeting id + passcode), never a bare id. The venue address
                      (in-person) or this link (zoom) is surfaced in the client
                      confirmation message + the GCal event; the FIELD/seam is built now
                      so Phase 2 is purely additive (no migration/form churn later);
                      duration_minutes is a SNAPSHOT — defaults from the linked package,
                      editable, required for ad-hoc bookings; with scheduled_time it gives
                      the session's time RANGE — needed to render the calendar block,
                      detect overlaps, and set the mirrored GCal event's end;
                      booking_notes = scheduling-context remarks only, e.g.
                      "first trial session", "client requested morning slot";
                      scheduled_date + scheduled_time always in SGT / Asia/Singapore;
                      MIDNIGHT RULE (decided 2026-06-20, Vitest-spec'd): a booking belongs
                      to its scheduled_date keyed off START time — a session starting
                      23:00–23:59 belongs to that date; 00:00 onward is the next day; a
                      late session is NOT wrapped across midnight into the next day's
                      count/overlap set (overlap math runs per scheduled_date on
                      [start_time, start_time+duration_minutes]);
                      LIFECYCLE: a new booking is `confirmed` (= the on-calendar,
                      outcome-pending state Jennefer calls "booked"); it stays `confirmed`
                      until EOD/SOD processing (§7) resolves PAST confirmed bookings to
                      completed / cancelled / no_show — there is NO separate "booked"
                      status and NO automatic transition;
                      database is the source of truth — gcal_event_id stored so the
                      admin panel can push edits and deletes to the mirrored GCal event;
                      status tracks session outcome — no_show counts as a consumed
                      session, same as completed; reinstating a no-show is done by
                      editing the same booking back to confirmed with a new date/time,
                      so no extra session is deducted from the package)

calendar_blocks   — id, block_type (vacation | training | team_event | personal |
                                     public_holiday | other),
                     title, start_date DATE, end_date DATE, all_day BOOLEAN,
                     start_time TIME?, end_time TIME?, notes?, venue_id?,
                     gcal_event_id?, created_by FK → admin_users.id,
                     created_at, updated_at
                     (non-client time that occupies the calendar — vacation, training,
                      team events, etc. — kept SEPARATE from bookings so the session
                      model stays pure (no client_id, no package, no session math);
                      start_date/end_date support multi-day spans (e.g. a vacation);
                      all_day = true ignores the time fields, mirroring how Google
                      Calendar models all-day events; when all_day = false, start_time/
                      end_time apply (e.g. a 9am–1pm training);
                      block_type is an ENUM + free-text title — "other" + title absorbs
                      anything unforeseen, so new enum values are rarely needed (added
                      via a small migration; enum values are easy to add, hard to remove);
                      venue_id usually null = "blocks Jennefer entirely"; set only for a
                      venue-specific block (e.g. a room closure) — matters once there are
                      multiple venues;
                      blocks ALSO push to the mirrored GCal calendar (env-prefixed title)
                      so vacation/training show on her iPhone alongside sessions;
                      both bookings AND blocks feed the DB-sourced availability/conflict
                      checks — see §7)

business_hours    — id, day_of_week INT (0=Sun … 6=Sat), start_time TIME, end_time TIME,
                     created_at, updated_at
                     (Jennefer's recurring weekly working hours, used ONLY to cosmetically
                      shade the admin calendar — working hours white, outside light pink;
                      NOT enforced — she may still accept ad-hoc bookings outside hours;
                      INTERVAL model: each row is one open interval; a day with NO row is
                      fully closed (e.g. Sunday) — this also lets a day hold multiple
                      intervals later (e.g. a lunch-break gap or split shift) with no schema
                      change; admin-editable so hours can change anytime without a deploy;
                      SEED: Mon–Fri 09:00–18:00, Sat 09:00–13:00, Sun closed (no row),
                      all SGT / Asia/Singapore; public holidays & one-off closures are
                      handled as calendar_blocks layered on top, NOT as hours changes)

gcal_sync_failures — id, resource_type (booking | calendar_block), resource_id INT,
                     operation (create | update | delete), attempts INT default 0,
                     last_error TEXT?, last_attempt_at DateTime?,
                     resolved BOOLEAN default false, resolved_at DateTime?,
                     created_at, updated_at
                     (the fail-soft GCal retry queue / "outbox" — added 2026-06-20.
                      GCal pushes are NON-FATAL (§12): if a Google call fails, the
                      booking/block still saves to Postgres and a row is written HERE so
                      the failure is visible and retryable. Only FAILURES land here — a
                      successful push writes nothing. Generic over both bookings AND
                      calendar_blocks (both mirror to GCal). RETRY happens (a) in EOD and
                      (b) SOD sweeps of unresolved rows, and (c) via a per-booking
                      "Retry calendar sync" button for ad-hoc retries; a successful retry
                      sets resolved=true. attempts/last_error/last_attempt_at give an
                      audit trail of retry tries.)

session_notes     — id, client_id, booking_id (optional),
                     note_date DATE, content TEXT,
                     created_by FK → admin_users.id,
                     created_at, updated_at
                     (per-session clinical notes written after each appointment;
                      booking_id is optional — can also record standalone notes
                      e.g. a phone call or follow-up message;
                      admin only — never visible to staff)

blog_posts        — id, title, slug, content (rich text JSON), excerpt,
                     cover_image_url, category, author_id FK → admin_users.id,
                     published, published_at, created_at, updated_at

testimonials      — id, client_name, service_id?, quote,
                     visible, sort_order INT, created_at, updated_at

admin_users       — id, name, username, email?, password_hash,
                     role (admin | staff), is_active BOOLEAN,
                     must_change_password BOOLEAN,
                     failed_login_attempts INT default 0, locked_until DateTime?,
                     last_login_at, created_at, updated_at
                     (username = unique login identifier, e.g. "jennefer.wong";
                      email is optional contact info only — NOT used to sign in;
                      BRUTE-FORCE LOCKOUT (decided 2026-06-20): 5 consecutive failed
                      logins lock the account; failed_login_attempts counts them,
                      locked_until holds the unlock time. Recovery = AUTO-UNLOCK after
                      60 minutes OR an admin clears it sooner via User Management
                      (whichever first) — auto-unlock prevents a permanent self-lockout of
                      the only admin. A successful login resets the counter. A light
                      per-IP request throttle is added on top as cheap defence-in-depth.)

audit_log         — id, actor_id FK → admin_users.id (nullable),
                     actor_username (snapshot at time of action),
                     action (create | update | delete | view_sensitive),
                     resource_type (client | client_package | booking | calendar_block |
                                    venue | business_hours | session_note | service |
                                    service_package | blog_post | testimonial | admin_user),
                     resource_id,
                     summary TEXT,
                     ip_address,
                     created_at
                     (append-only — rows are never updated or deleted;
                      actor_id is nullable to handle the edge case where the actor's
                      admin_users record is later deactivated/deleted — actor_username
                      snapshot preserves the identity regardless;
                      summary = human-readable description of what changed,
                      e.g. "Updated: name, whatsapp_number" — never stores actual field
                      values to avoid duplicating sensitive data outside encrypted fields;
                      view_sensitive action logged whenever session notes are read —
                      supports PDPA accountability obligations)

### Security approach

No field-level encryption. Security relies on three layers:

- **Passwords** — bcrypt-hashed via NextAuth.js; never stored in plain text; no key to lose
- **Data at rest** — Neon encrypts the database storage at the infrastructure level; protects against physical media exposure
- **Access control** — admin panel authentication (username + password) is the primary gate; all data access requires a valid session; role-based restrictions limit what staff can see

This is a deliberate, considered choice for a small practice. The operational risk of losing a field-level encryption key (all client records permanently unreadable) outweighs the marginal security gain over Neon's existing at-rest encryption.
```

---

## 9. Access Control

Two roles. Multiple users can hold either role.

| Feature | Admin | Staff |
|---|---|---|
| Dashboard | ✓ | ✓ |
| Bookings — add / edit / delete | ✓ | ✓ |
| Calendar blocks (vacation / training / etc.) — add / edit / delete | ✓ | ✓ |
| Clients — name, WhatsApp, email, booking history | ✓ | ✓ |
| Clients — general notes | ✓ | ✓ |
| Session notes — view / add / edit | ✓ | ✗ |
| Blog editor — create / edit / publish | ✓ | ✓ |
| Testimonials — add / edit / show-hide | ✓ | ✓ |
| Services & pricing editor | ✓ | ✗ |
| Venues — add / edit / deactivate | ✓ | ✗ |
| Business hours — edit | ✓ | ✗ |
| User management (add / edit / deactivate users) | ✓ | ✗ |
| Audit log — view | ✓ | ✗ |

**Implementation:** role stored in `admin_users.role`; Next.js middleware checks role on every `/admin` route and enforces page- and field-level restrictions (session notes and general client notes omitted from API responses for staff).

**Bootstrapping — default admin account:**
The database seed script creates one default admin account on first setup:
- Username: `admin` (login is username-based, not email)
- Password: pre-defined, documented securely
- On first login, the system forces a password change before access is granted
- The owner uses this account to create real admin/staff accounts
- The default account should be deactivated once real accounts are set up

`admin_users` table gets an additional column: `must_change_password BOOLEAN DEFAULT false` — set to `true` for the seeded default account.

---

## 10. Audit Log

A single `audit_log` table records every significant action taken in the admin panel — creating, editing, or deleting any record, plus read access to session notes. This supports PDPA accountability obligations for a practice handling sensitive client data.

**What is logged:**

| Action | resource_type | Example summary |
|---|---|---|
| Add client | `client` | `"Created client record"` |
| Edit client | `client` | `"Updated: name, whatsapp_number"` |
| *(Clients are never deleted — no delete action exists, decided 2026-06-20)* | — | — |
| Add package purchase | `client_package` | `"Recorded purchase: 3-session hypnotherapy package"` |
| Edit / cancel package purchase | `client_package` | `"Updated: status"` |
| Mark package paid / change payment mode | `client_package` | `"Updated: paid, payment_mode"` |
| EOD: resolve booking outcome | `booking` | `"Updated: status"` |
| Add booking | `booking` | `"Created booking"` |
| Edit booking | `booking` | `"Updated: scheduled_date, status"` |
| Mark booking as no-show | `booking` | `"Updated: status"` |
| Reinstate no-show booking | `booking` | `"Updated: scheduled_date, status"` |
| Delete booking | `booking` | `"Deleted booking"` |
| Add / edit / delete a calendar block | `calendar_block` | `"Created block: vacation"` |
| Add / edit / deactivate a venue | `venue` | `"Updated: name"` |
| Edit business hours | `business_hours` | `"Updated: Sat hours"` |
| View a client's session notes (bulk) | `client` | `"Viewed session notes for client"` |
| Add / edit / delete / view an individual session note | `session_note` | `"Created session note"` |
| Add / edit / delete service or package | `service`, `service_package` | `"Updated: price_sgd"` |
| Publish / edit blog post | `blog_post` | `"Published post: [slug]"` |
| Add / edit testimonial | `testimonial` | `"Updated testimonial visibility"` |
| Add / edit / deactivate admin user | `admin_user` | `"Created user: staff role"` |

**Design decisions:**
- **`resource_id` convention** — `resource_id` always holds the id of a record *of the matching `resource_type`*. For a **bulk** session-notes view (a client's whole note history, where no single note is the target) log `resource_type=client, resource_id=<client_id>`; reserve `resource_type=session_note` (with the note's real id) for actions on an **individual** note. The same rule applies generally: never put one type's id under another type's `resource_type`.
- **Append-only** — rows are never updated or deleted; the log is tamper-evident by design
- **No raw field values** — `summary` records *which fields changed*, not *what the values were*, to avoid duplicating sensitive data outside encrypted columns
- **Actor snapshot** — `actor_username` captured at write time; remains readable even if the actor's account is later deactivated or deleted
- **No encryption on audit_log** — the table contains no sensitive field values; only metadata about actions
- **Admin only** — audit log is visible to admin role only; staff cannot view it
- **Admin panel page** — a read-only `/admin/audit-log` page showing a filterable, paginated table (filter by actor, resource type, date range)

**PDPA relevance:** If a client invokes their right of access, the audit log can demonstrate who has accessed or modified their record, and when. The `view_sensitive` action (logged against `client` for a bulk notes view, or `session_note` for an individual note) is particularly important for clinical accountability.

---

## 11. WhatsApp Integration

- No API or WhatsApp Business API required in Phase 1
- **Business number: +65 8013 6006** (wa.me form: `6580136006`)
- Uses `https://wa.me/<phone>?text=<encoded_template>` links
- Pre-formatted template message is encoded in the URL
- Customer can edit the template before sending
- All confirmation is handled manually by the practitioner via chat

**Why the WhatsApp Business API is NOT used (decided 2026-06-15):** the business number `+65 8013 6006` is committed to the normal WhatsApp multi-device setup — a spare iPhone app + WhatsApp Web on PC(s) (and a future receptionist on another PC). Registering it to the WhatsApp Business **API** would disable all of that (an API number can't be used in the regular app/Web). The API would also require Meta-approved templates + per-message cost. So Phase 1 stays on free `wa.me` click-to-chat. (Revisit only if she dedicates a *separate* number — Phase 2.)

**Two directions of `wa.me` (the recipient is the `<phone>` in the link):**
- **Public "Book via Chat"** → recipient = **business number**; the *client* messages Jennefer. On mobile it opens the client's WhatsApp app; on desktop it opens WhatsApp Web / "Continue to Chat" (slightly more friction — also show the plain number on Contact as a fallback).
- **Admin "Send confirmation to client"** (one-tap, Phase 1 booking notifications) → recipient = **the client's `whatsapp_number`**, message pre-filled (name, service, date, time). Jennefer taps it from her business iPhone or a PC logged into WhatsApp Web as the business number → it opens a chat **from `+65 8013 6006` to that client**, pre-filled but **NOT auto-sent** (wa.me can't auto-send — she reviews + taps send; the human-in-the-loop makes it safe).

**Per-status confirmation buttons (admin booking UI, Step 4):**
| Status change | Send button? |
|---|---|
| Confirmed (new) | ✅ Yes |
| Changed (rescheduled) | ✅ Yes |
| Cancelled | ✅ Yes |
| **Reminder (day before)** | ✅ Yes — offered during EOD for *tomorrow's* bookings (decided 2026-06-20); same `wa.me` / copy-button mechanic; reduces no-shows. |
| **No-show** | ❌ **No — stay silent (decided 2026-06-15).** Sessions are pre-paid; a no-show forfeits the slot. No rebook offer — deliberately do not message no-shows. |

- **Implementation:** pure front-end link-building (no API, no cost, no backend send) — slots into the Step 4 bookings UI. Must **normalize** the client's number to wa.me form (digits + country code, strip `+`/spaces; e.g. `+6591234567` → `6591234567`); validate/normalize WhatsApp numbers on the client form.
- Exact message wording: TBD when the bookings UI is built (templates are a later detail).

**Fallback for clients without WhatsApp (manual SMS / email) — DECIDED 2026-06-19:** some clients won't use WhatsApp, so the booking-confirmation panel also provides **copy buttons** to ease manual SMS/email, all pure front-end (Clipboard API — works on her iPhone in a secure/https context):
- **Copy phone number** — the stored `whatsapp_number` reformatted to dial-friendly `+65…` form (it's stored normalized as `6591234567`).
- **Copy email** — rendered **only when `clients.email` is non-null** (email is optional in the schema). *(Plain copy only — `mailto:`/Gmail-deep-link pre-fill was considered and dropped for now: `mailto:` doesn't reliably reach browser Gmail without a manual handler opt-in, so the universal copy button is the simpler, dependency-free choice. Could revisit post-launch if staff want it.)*
- **Copy confirmation message** — the **same template** used for the `wa.me` link, reused as plain text (one message source for all channels). The template is **delivery-aware**: in-person confirmations include the **venue name/address**; Zoom confirmations include the **`zoom_join_url`** only when it's an actual link, otherwise they say Jennefer will arrange the Zoom session (the Phase-1 default "to arrange manually" is never sent as if it were a link).
- Each button shows brief **"Copied ✓"** feedback (no other cue on mobile). Same status policy applies — these fallbacks exist for **confirmed / changed / cancelled**, **never for no-show**.

---

## 12. Google Calendar Integration

> ⏸️ **DEFERRED to a much later phase (decided 2026-06-28).** The in-app month→day calendar (Step 4.5b) is good enough as the planning surface, so the Google Calendar **write-API is NOT built in the current phase.** The seam stays as **dormant scaffolding**: keep `src/lib/gcal.ts` (a no-op stub) and the `gcal_sync_failures` table in place, but **exclude all GCal work from the current build — including the GCal-retry sweep in EOD/SOD** (§7) and the per-booking "Retry calendar sync" button. The whole section below describes the eventual write-API design for when it is switched on; it is purely additive.
>
> **Phone visibility is instead solved by a lightweight ICS subscription feed ("Pattern A") — see §12B — to be prototyped AFTER Steps 4.5 + 4.6.** The ICS feed gives Jennefer a native-iPhone view of her bookings (and, via `VALARM`, pre-session alerts for advance-booked sessions) with none of the OAuth / ops-account / 3-calendar / refresh-token-trap cost. Revisit the Google write-API only if she later needs guaranteed instant alerts for *same-day, just-booked* sessions (the one thing the feed can't reliably do).

- Write-only mirror — the admin panel pushes events to Google Calendar; it never reads events from Google Calendar to discover bookings
- The practitioner sees all appointments in their Google Calendar app on their iPhone (read-only from their perspective there)
- Admin panel authenticates with Google Calendar API using OAuth 2.0 (one-time setup)
- Dashboard reads upcoming bookings from the PostgreSQL database — not from Google Calendar
- **On create:** admin panel creates a GCal event and stores `gcal_event_id` in the booking record
- **On edit:** admin panel updates the GCal event using the stored `gcal_event_id`
- **On delete:** admin panel deletes the GCal event using the stored `gcal_event_id`
- **Event `location`:** for `in_person` bookings = the venue's name/address; for `zoom` bookings = the `zoom_join_url` (so the link is one tap away in her iPhone calendar). Calendar blocks set a sensible title/location too (e.g. "Vacation").
- **Event start/end:** a booking's event runs `scheduled_time` → `scheduled_time + duration_minutes`; a `calendar_block` maps to an all-day event (when `all_day`) or a timed event from its start/end.
- **Blocks are mirrored too:** `calendar_blocks` push their own create/update/delete GCal events (so vacation/training appear on her iPhone alongside sessions), under the **same fail-soft rule** — a failed Google call never blocks saving the booking/block to Postgres (the source of truth).
- All Google Calendar events use timezone `Asia/Singapore` (SGT, UTC+8)
- Phase 2 note: if international Zoom clients are added, timezone handling will need revisiting (store client timezone + convert to SGT for display)
- Requires: `googleapis` Node.js library + Google Cloud Console project + OAuth 2.0 credentials (Calendar API scope: `calendar.events`)

### Environment strategy — 3 calendars, 1 OAuth client (CHOSEN 2026-06-15, "Design A")

The calendar *count* is independent of the OAuth *count*. We use **one** Google Cloud project + **one** OAuth client + **one** refresh token, and isolate environments purely by **calendar ID**.

- **One dedicated ops Google account** (e.g. `bookings@jenneferwong.sg` or a controlled Gmail — **NOT** Jennefer's personal account) owns **three calendars**: `JW Bookings — DEV`, `JW Bookings — UAT`, `JW Bookings — PROD`.
- **1 OAuth client + 1 refresh token** (the ops account) grants access to all three calendars. The only per-environment difference is the **`GOOGLE_CALENDAR_ID`** env var.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` are **shared/identical** across environments; **`GOOGLE_CALENDAR_ID` differs per environment** (dev/uat/prod calendar id).
- **Jennefer's iPhone visibility:** share the `— PROD` calendar from the ops account to her personal Google account → it appears in her iPhone Calendar app. DEV/UAT are never shared to her, so test events never reach her phone.

**Precautions (all adopted):**
- **Isolation is the point** — test environments (dev/uat) must NEVER write to the PROD calendar. The 3-calendar split + separate `GOOGLE_CALENDAR_ID` per env enforces this.
- **Naming/visibility safety** — environment name in each calendar's title AND an env prefix on event titles (e.g. `[DEV] Hypnotherapy — Amanda`) so a misconfig is spotted instantly rather than silently polluting prod.
- **Cleanup** — DEV/UAT calendars accumulate junk from seeds/test runs; periodically delete-and-recreate or run a script to clear future events on them. PROD is never bulk-cleared.
- **Fail-soft** — the GCal push is a NON-FATAL mirror: if the Google call fails, the booking still saves to Postgres (source of truth) and the failure is recorded in the **`gcal_sync_failures`** retry queue (§8, added 2026-06-20). Google being down must never block taking a booking. **Retry** happens during EOD/SOD sweeps of unresolved rows and via a per-booking **"Retry calendar sync"** button (ad-hoc); a successful retry marks the row `resolved`. This replaces the vague earlier "the failure is logged" — failures now have a concrete, visible, retryable home covering both bookings and calendar_blocks.
- **Dev no-op option** — GCal client is a no-op when `GOOGLE_CALENDAR_ID` (or refresh token) is unset; local dev leaves it unset for offline/fast work and only points at the DEV calendar when actively testing the integration. ("3 calendars" and "dev no-op" coexist.)
- Build note: in Step 4 (bookings) the GCal push sits behind an interface and is **stubbed** until the OAuth creds + ops account + calendars exist; real integration is exercised in UAT against the UAT calendar before it ever touches PROD.

---

## 12A. Blog Editor & Rendering (Tiptap)

> ⏸️ **DEPRIORITIZED (2026-06-15) — blog is not a critical part of Phase 1; moved to a late step (after admin modules + public pages). Build order: …→ clients/packages/bookings → audit-log viewer → public pages → BLOG.**
> ⏸️ **DECISION PENDING — renderer choice (Option A vs B) is NOT finalized. Owner is ~80% leaning Option B but needs to discuss with Jennefer first. DO NOT build the blog module until the owner confirms.** The editor decisions below are agreed; only the renderer is open. The A/B decision can land anytime before the blog step.

### Editor (agreed)

- **Tiptap** rich-text editor embedded in the admin panel (`/admin/blog`), available to **Admin + Staff** (per §9).
- Content stored as **Tiptap/ProseMirror JSON** in `blog_posts.content` (already in the schema, §8) — structured content, not raw HTML. Other post fields already in schema: `title`, `slug`, `excerpt`, `cover_image_url`, `category`, `published`, `published_at` (supports scheduled publish), `author_id`.
- Formatting set: StarterKit — headings, bold/italic, bullet/numbered lists, links, blockquote, etc.
- **Inline images anywhere in the body — CONFIRMED requirement** (so we build the full image-upload pipeline, not cover-image-only).
- **Image resize while editing** — provided by a *resizable-image editor extension* (Jennefer drags to resize; the chosen width is saved as a node attribute). This is an **editor** feature, independent of the renderer (A or B) choice.
- **Video = YouTube embeds** via `@tiptap/extension-youtube` (paste a URL; the video stays on YouTube — no upload/storage/transcoding on our side). Self-hosted video is **not** planned; use embeds. (Vimeo/Mux could be added later as a custom embed node if ever needed.)

### Image upload pipeline (agreed)

- Tiptap stores only a **URL reference** to each image, never the file bytes. Image files live in **Vercel Blob** (object storage); the post JSON holds the returned URL.
- An **auth-gated upload route** (admin/staff only) using the `@vercel/blob` SDK; validates file type/size.
- **Resize/compress images on upload** (store a web-optimized version) — keeps pages light; especially important if renderer = Option B (which emits plain `<img>` with no automatic optimization).
- **Setup task (owner):** create a **Blob store** in Vercel (project → Storage → create Blob). This provisions `BLOB_READ_WRITE_TOKEN`; needed in local `.env` for dev (auto-set on Vercel deployments). Only required for build Stage 2 (uploads), not Stage 1.

### Renderer — turns stored JSON into the public page (DECISION PENDING)

The public blog page must render the stored JSON. Two options:

- **Option A — custom React renderer.** We write a small renderer mapping each node/mark to React elements. Pros: leaner pages; images via **`next/image`** (auto-resize/lazy-load/CDN); no raw-HTML injection so **no sanitize step**. Con: exact fidelity to the editor is **by our effort** — we must handle every node/attribute (incl. the resize width).
- **Option B — `@tiptap/html` `generateHTML` (server-side).** Reuses the editor's own extension definitions to emit an HTML string we inject. Pros: **automatic exact fidelity** to the editor (its main selling point); slightly less code for us. Cons: produces plain `<img>` (un-optimized → mitigate with resize-on-upload); needs a one-time **HTML sanitize** step; slightly larger server function.
- **Performance clarification (important):** B's Tiptap weight stays **server-side** — the visitor downloads HTML either way, so **B is NOT slow for readers** (~1–2s typical; the feared "10s" is not in play). B's server cost is ~0 if blog pages are pre-rendered (SSG/ISR).
- **Current lean: ~80% Option B** (for automatic exact fidelity). **AWAITING OWNER CONFIRMATION after they discuss with Jennefer.**

### Caveats / things to remember to address

1. **Sanitize (if Option B):** use an allow-list HTML sanitizer library; configure allowed tags/attributes; **one careful rule to allow YouTube `<iframe>` only** (sanitizers strip iframes by default — miss this and embeds vanish). Real risk is low (only trusted admins author) but it's cheap insurance.
2. **Resize/optimize images on upload** — keeps pages light (esp. Option B's plain `<img>`).
3. **Keep editor & renderer extension sets in sync** (either renderer) so output matches what was authored.
4. **`next.config` `images.remotePatterns`** must whitelist the Vercel Blob domain (for `next/image`, Option A).
5. **Orphaned image files:** deleting an image from a post does NOT auto-delete the Blob file — either accept orphans or add a periodic cleanup pass. (A managed CMS like Sanity would handle this; with Tiptap it's on us.)
6. **Editor is a Client Component** loaded with `dynamic(ssr:false)` (ProseMirror touches the DOM, can't SSR).
7. **Responsive images:** blog images must **shrink-to-fit small screens** even when Jennefer set a fixed width — covered by the real-device check (§16 item 23).
8. **Store image width/height (and alignment) as node attributes** for layout stability (avoid shift) and fidelity.
9. **Pre-render blog pages (SSG/ISR)** for speed and to make Option B's server cost ~0; revalidate on publish/edit.

### Build stages (when greenlit)

1. **Stage 1:** Blog CRUD (list/new/edit, publish toggle, excerpt/category/slug/cover-image field) + Tiptap **text-only** editor + the renderer — full write→save→display loop. *Needs nothing from Vercel.*
2. **Stage 2:** Inline image upload → Vercel Blob (needs the Blob store + token; resize-on-upload).
3. **Stage 3:** YouTube embeds.

---

## 12B. Phone calendar visibility — ICS subscription feed ("Pattern A")

> **CHOSEN 2026-06-28 as the phone-visibility path (in place of the Google write-API, §12). Prototype AFTER Steps 4.5 + 4.6.**

The goal is narrow: let Jennefer see her bookings on her **native iPhone calendar** (and ideally get a pre-session beep) without the heavy Google write-API. An **ICS subscription feed** delivers this cheaply.

**How it works:**
- One **tokenized, read-only** endpoint: `/api/calendar/feed/<secret-token>.ics`. It is **not a stored file** — it's a route that, on each request, queries the DB for all current bookings (+ calendar blocks) and renders **iCalendar** text live. Nothing is pre-generated; there is **no per-booking sync work** (booking create/edit/cancel are already DB writes; the feed just reflects current DB state on the next fetch).
- The phone **pulls** the feed on its own schedule (iOS "Fetch New Data", ~15–60 min). We never push. So updates land on the phone on its next refresh — fine for glancing, not a live second-by-second mirror.
- Each event carries a **stable `UID`** (`booking-<id>@jenneferwong.sg`, `block-<id>@…`) so edits **update in place** (no duplicates) and cancelled/deleted bookings simply **drop out** of the feed and disappear on next refresh. Cancelled bookings are **excluded** from the feed output.
- **Alarms:** embed `VALARM`s (e.g. `TRIGGER:-PT1H`, `-P1D`). **iPhone Apple-Calendar subscriptions honour them** (so advance-booked sessions beep), provided the subscription's "Ignore Alerts" is off; **Google Calendar subscriptions strip them**. So she should subscribe via iOS's native calendar subscription, not via Google. **Limitation:** an alarm only fires for an event the phone has already pulled — a *same-day, just-booked* session may not have synced in time, so its alert can miss. That single flaky case is the only thing the Google write-API would add.

**Security (capability URL):** a subscribing calendar client can't log in (no form, no cookie), so the secret lives **in the URL** — an unguessable token (32+ random bytes), same model as Google's own "secret iCal address." Rules: token **stored in the DB and revocable** (rotate → old URL 404s, she re-subscribes; rotation freezes, never wipes); **HTTPS only**; **never log the token**; and **decide event-title detail** (full client name vs initials vs generic "Hypnotherapy session") to limit PDPA exposure if the URL ever leaks (feed contains client names + times).

**Resilience (a key requirement):** a **failed/blocked pull never wipes the phone** — the subscribed calendar keeps its last good snapshot and reconciles on the next successful fetch (a multi-day outage = stale, not lost). The **only** wipe risk is a *successful* pull that returns empty/garbage, so the endpoint **MUST return HTTP 500 on any internal error and NEVER a 200 with an empty calendar** ("zero bookings" and "something broke" must look different to the client).

**Setup UX (iOS 18):** Settings → **Apps** → Calendar → Accounts → Add Account → Other → **Add Subscribed Calendar** → paste URL (Calendar moved under "Apps" in iOS 18). Easiest path = hand her a **`webcal://…` link** she taps once to get the subscribe prompt. Refresh cadence = Settings → Apps → Calendar → Accounts → **Fetch New Data**.

---

## 13. Navigation Structure

```
[Logo]  About  Services  Testimonials  Blog  Contact  [Book via Chat ▶]    ☰ (mobile)
```

- Hamburger menu on mobile with all nav links + "Book via Chat" CTA
- Footer: logo, short tagline, nav links, WhatsApp link, copyright

---

## 14. Implementation Phases

### Phase 1 — Core Website (this build)
- [ ] Set up Neon project with `main`, `dev`, `uat` database branches
- [ ] Set up Vercel project connected to GitHub repo: `main` → Production, `uat` → pinned Preview, each with its own `DATABASE_URL`
- [ ] Database setup: Prisma schema, run migrations against `dev` branch
- [ ] **Pre-Step-4 schema delta-2 (2026-06-20):** `admin_users` +`failed_login_attempts`/`locked_until`; `client_packages` +`paid`/`payment_mode`/`paid_date`/`created_by` (+`PaymentMode` enum); new `gcal_sync_failures` table (+ its enums); raw-SQL CHECK constraint on `bookings` for the delivery XOR — then regenerate the `init` migration + reset/reseed dev (dev is disposable; uat/main still empty)
- [ ] Seed `dev` database: default admin account (forced password change on first login) + services & packages + one venue + business-hours rows + synthetic test data
- [ ] Project scaffolding: Next.js 14, Tailwind CSS, connect to `dev` database
- [ ] Google Cloud Console project + OAuth 2.0 credentials for Calendar API
- [ ] Design system: colors, typography, components (Button, Card, Nav, Footer)
- [ ] Public pages: Homepage, About, Services, Blog (list + post), Contact, **Privacy Policy** (PDPA notice, footer-linked)
- [ ] **Accessibility baseline on public pages** (alt text on images, sufficient colour contrast for the soft cream/sage/mauve palette, visible keyboard-focus outlines)
- [ ] WhatsApp "Book via Chat" integration
- [ ] Admin auth (NextAuth.js, username/password, role-based access: admin | staff) + **Step-4.6 auth-hardening bundle**: brute-force lockout (5 fails → 60-min auto-unlock / admin override) + per-IP throttle + strong-password enforcement + generic login errors + session timeout + security headers (no `/admin` rename, no 2FA — both declined 2026-06-20)
- [ ] Admin: User management (add/edit/deactivate users, assign roles)
- [ ] ~~Google Calendar API integration (write-only; push create/update/delete from admin panel to GCal)~~ → **DEFERRED to a later phase (2026-06-28, §12)**; keep `gcal.ts` stub + `gcal_sync_failures` table dormant
- [ ] **ICS subscription feed (§12B)** — tokenized read-only `/api/calendar/feed/<token>.ics` for native-iPhone visibility + `VALARM` alerts; **prototype AFTER Steps 4.5 + 4.6**
- [ ] Admin: Venues table (seed one default, admin-only) + Blocks (`calendar_blocks`: vacation/training/etc.; admin+staff; push to GCal) + Business hours (recurring weekly, admin-only, seed Mon–Fri 9–6 / Sat 9–1 / Sun off)
- [ ] Admin: Client manager (directory, booking history, package purchases & session consumption, free-text notes, admin-only session notes) — **built before Bookings** (a booking selects an existing client + package)
- [ ] Admin: Bookings manager (add/edit/delete; venue + delivery_type + duration_minutes; **hard-block on exhausted package**; ~~GCal mirror push + `gcal_sync_failures` retry~~ **GCal deferred — §12**), with a DB-sourced **month→day calendar view** (bookings ∪ blocks; working-hours shading white/pink; click-to-create pre-fills the form) + **inline soft overlap warning** + **EOD/SOD processing** (resolve outcomes, day-before reminders; **no GCal retry in current build**)
  - 4.5a (CRUD + overlap/GCal-stub seam) **DONE**, 4.5b (month→day calendar) **DONE**, 4.5c (wa.me confirmation + copy-button panel) **DONE** + many UI-refinement rounds (see `docs/PROGRESS.md`); **NEXT: 4.5d** (EOD/SOD, no GCal retry), then 4.6 (Vitest + auth-hardening)
- [ ] Admin: Blog editor (Tiptap, publish/unpublish)
- [ ] Admin: Testimonials manager
- [ ] Admin: Services/pricing editor
- [ ] Admin: Audit log viewer (read-only, filterable)
- [ ] UAT anonymization script (resets `uat` from `main` via Neon "reset from parent," then scrubs PII fields)

### Phase 2 — Online Sessions & Growth
- [ ] **Google Calendar write-API** (deferred from Phase 1 — §12): only if the ICS feed's pre-session alerts prove insufficient (i.e. she needs guaranteed instant alerts for same-day, just-booked sessions). Re-enables the dormant `gcal.ts` + `gcal_sync_failures` scaffolding + the EOD/SOD GCal-retry step.
- [ ] Zoom session support (meeting link field in admin, Zoom package types)
- [ ] SEO optimization (metadata, sitemap, OG images)
- [ ] Connect `jenneferwong.sg` domain to Vercel production deployment
- [ ] Replicate visual design from `jenneferwong.com` (once finalized) into this project's Tailwind config + components
- [ ] Analytics (e.g. Plausible or Google Analytics)

---

## 15. Open Items / Decisions Deferred

| Item | Status |
|---|---|
| Practitioner's name | **Resolved** — Jennefer Wong |
| WhatsApp Business phone number | **Resolved** — +65 8013 6006 (wa.me: `6580136006`) |
| Google Calendar write-API | **DEFERRED to a later phase (2026-06-28, §12).** Not built in the current phase; `gcal.ts` stub + `gcal_sync_failures` table kept dormant. Phone visibility handled instead by the **ICS feed (§12B)**. Revisit only if guaranteed instant alerts for same-day, just-booked sessions are needed. When built: Google Cloud Console project + OAuth 2.0 + ops account + 3 calendars (Design A). |
| Phone calendar visibility — ICS feed | **DECIDED 2026-06-28 (§12B), prototype AFTER Steps 4.5 + 4.6.** Tokenized read-only `/api/calendar/feed/<token>.ics`, rendered live from the DB; phone pulls on its Fetch schedule; stable per-booking `UID`; `VALARM` alerts (work on iPhone Apple-Calendar subscriptions, not Google); capability-URL token (stored, revocable, never logged); endpoint must 500 on error (never serve an empty calendar) so a failed pull never wipes the phone. Still to decide: event-title detail (full name vs initials vs generic) for PDPA. |
| Domain registration | **Resolved** — `jenneferwong.sg` (this project, already registered); `jenneferwong.com` also registered, used separately for a Wix-based design site |
| Design replication from `jenneferwong.com` | Deferred until the owner finalizes the Wix site design; Section 2's design is a Phase 1 placeholder until then |
| Pricing finalization | Tentative — editable via admin after launch |
| Zoom integration (Tarot Clarity online) | **Split (2026-06-19, refined):** **Phase 1 = manual arrangement** — Jennefer arranges the Zoom session with the client directly; `bookings.zoom_join_url` defaults to text "to arrange manually" (editable; no API); confirmation says she'll arrange it. **The base is built now** (`delivery_type` + `zoom_join_url` field + in-person/zoom XOR), so **Phase 2 = Zoom API** is purely additive — auto-assign a unique join URL per zoom booking, plus international-client timezone handling. (Dropped the practice-level "default Zoom link" setting — moot once she arranges per client.) |
| Blog renderer: Option A vs B | **Pending owner confirmation** — ~80% leaning Option B (`@tiptap/html`, automatic exact fidelity); owner to discuss with Jennefer first. Editor decisions agreed. See §12A. Do not build the blog module until confirmed. |
| Vercel plan: Hobby vs Pro | **Resolved (for now)** — starting on Hobby ($0). `dev`/`uat` preview URLs won't have password protection on this tier; revisit upgrading to Pro ($20/month/member) later if that becomes a concern or for commercial ToS compliance. |
| UAT pinned preview URL + `NEXTAUTH_URL` | **TODO** — set up a pinned/stable preview deployment for `uat`, then set `NEXTAUTH_URL` to that pinned URL (Preview env) and redeploy. Also migrate the Neon `uat` branch. See §4 env-var reminder. |
| Production `NEXTAUTH_URL` (+ domain/DB) | **TODO (with DNS task)** — once `jenneferwong.sg` DNS resolves on Vercel, set `NEXTAUTH_URL=https://jenneferwong.sg` (Production env) and redeploy; also set `main`-branch `DATABASE_URL`/`DIRECT_URL` and migrate the Neon `main` branch. See §4 env-var reminder. |
| Email addresses & provider | **In discussion (to resume) — preference DECIDED: use `@jenneferwong.com`** (not `.sg`) for email. Email and web hosting are independent DNS records, so `.com` can host email even while its website is Wix today / redirects to `.sg` later — but **carry the MX/SPF/DKIM/DMARC records over whenever `.com`'s DNS moves** or mail breaks (pairs with the DNS task). Provider options weighed: (a) **Google Workspace** ~SGD 8/seat/mo — real `jennefer@jenneferwong.com` mailbox (send+receive), **up to 30 aliases/user free** (`hello@`, `contact@`, etc.), free Groups, and it doubles as a Google account for Calendar; vs (b) **free** Cloudflare Email Routing forwarding (`hello@`/`contact@` → her Gmail, receive-only) + a free standalone Gmail. Admin-panel login is already **username-based**, so admin emails need not be real mailboxes. The **Calendar ops account** (Design A, §12) should be separate from her personal account — either a 2nd Workspace seat or a free standalone Gmail (keeps cost to one seat). **Still to decide:** which provider; resume next session. |
| Staff directory (HR/contact table) | **Deferred — build when the first real staff member is hired** (currently only Jennefer; no current use, nothing depends on it, additive table when needed). Design decided: a **standalone `staff` table** (name, handphone, personal email, address, …) with an **optional, unique** link `staff.admin_user_id Int? @unique` → `admin_users.id`. `admin_users` (logins) and `staff` (HR records) are **independent overlapping sets** — neither is a subset: staff can exist with no login (`admin_user_id` null), and logins can exist with no staff record. `session_notes.created_by` / `audit_log.actor_id` keep referencing `admin_users` (the acting login), not `staff`. PDPA: treat staff fields as sensitive PII (access-controlled + audited). |
| Booking system — blocks & venues | **Decided 2026-06-19, build in Step 4** (§7/§8/§10/§14). (1) **`calendar_blocks`** table (separate from `bookings`, keeps session model pure) for vacation/training/team_event/personal/public_holiday/other — `block_type` **enum + free-text `title`**; all-day/multi-day or timed; pushes to GCal. New enum values via small migration, but "other"+title absorbs the tail. (2) **`venues`** table, seed one default, `bookings.venue_id?` (in-person only) + `bookings.delivery_type` snapshot; venue → GCal `location`. Venues are a table (growing self-service data) vs block-types an enum (fixed vocabulary) — deliberate. (3) Availability is **DB-sourced in the admin panel** (never GCal as the planning surface): a **month→day calendar view** + an **inline soft overlap warning**, both unioning bookings ∪ blocks; custom lightweight calendar (iPhone-friendly, no heavy lib). Finer venue UX (colour-coding, multi-venue picker, venue-aware conflict logic) to revisit when a 2nd venue/practitioner exists. **(4) `bookings.duration_minutes`** snapshot added (defaults from package, editable, required ad-hoc) — gives each session an end time for calendar rendering, overlap detection, GCal event end. **(5) `business_hours` table** (recurring weekly: Mon–Fri 9–6 / Sat 9–1 / Sun off SGT; interval model; admin-only) drives **cosmetic** calendar shading (working hrs white / outside light pink), **NOT enforced**. **Still deferred:** buffer/gap time (Jennefer spaces sessions manually) and recurring/repeating blocks (every-Tuesday-off style) — one-off `calendar_blocks` + the weekly `business_hours` base cover Phase 1. |
| Booking DB schema (Step 4) | **DONE 2026-06-19 — `origin/dev` @ `33a860a`.** Implemented the §8 delta: `BlockType` enum + extended `AuditResourceType`; new `venues`, `calendar_blocks`, `business_hours` tables; `bookings` +`venue_id`/`zoom_join_url`/`delivery_type`/`duration_minutes`. Regenerated the single `init` migration (clean column order), dev reset+reseeded (placeholder venue, Mon–Sat business hours, delivery/duration on all bookings, 2 blocks), Prisma client regenerated. Schema is now **ahead of the app** — no Bookings/Venues/Blocks/Business-hours admin UI yet (that's the rest of Step 4). `uat`/`main` Neon branches still empty (get full schema when first migrated). **⚠ A second additive delta (delta-2, decided 2026-06-20) is still PENDING before the UI:** `admin_users` lockout fields, `client_packages` payment fields + `created_by`, `gcal_sync_failures` table, and the bookings XOR CHECK constraint — apply, regenerate `init`, reset/reseed dev. |
| Auth hardening (Step 4.6) | **Decided 2026-06-20.** A bundle of low/zero-friction login defences, built alongside the Vitest suite in Step 4.6 (chosen over 2FA, which the owner declined as too much friction — so the password gate carries more weight). (1) **Brute-force lockout:** 5 consecutive failed logins lock an account; recovery = **auto-unlock after 60 min OR an admin clears it sooner** via User Management (whichever first — prevents permanent self-lockout of the only admin). Fields `admin_users.failed_login_attempts` + `locked_until`; a successful login resets the counter. Plus a **light per-IP request throttle** (rate-limiting = throttle by source/time; lockout = freeze a specific account — complementary). (2) **Strong-password enforcement** on the change-password flow (min length ~12) — one-time friction, matters most without 2FA. (3) **Generic login errors** — "wrong username" and "wrong password" must be indistinguishable (no username enumeration); verify the current login doesn't already leak this. (4) **Sensible session timeout** — a reasonable NextAuth JWT `maxAge` so an unattended session doesn't live forever. (5) **Security headers** (HSTS etc.) + keep the admin `noindex` (already set on the admin layout). |
| Admin path obscurity / 2FA | **Both DECLINED 2026-06-20 (brainstorm).** **No `/admin` → secret path rename:** it's security-through-obscurity and is defeated at runtime by this very stack — NextAuth's fixed `/api/auth/signin` and the middleware redirects bounce any prober to the configured login page regardless of its name; private repo removes the source-leak but not this runtime leak. Net: keep `/admin` (a rename would only be log hygiene, never protection). **No 2FA/TOTP:** owner judged it too much friction for a two-person practice; accepted trade-off. Parked for the future: a low-friction **"remember this device for 30 days"** TOTP variant if ever reconsidered. Compensating controls = the Auth-hardening bundle above. |
| Ad-hoc bookings (no package) | **Reversed for creation 2026-06-28.** Originally bookings could be ad-hoc (no `client_package_id`). NOW: the **New-booking form requires a package** (no ad-hoc option; pre-selects the client's oldest available package); if the client has no package with sessions left, the form blocks and links to "Record a purchase". Server enforces package-required on create. **Edit still allows clearing the package** so legacy/ad-hoc bookings remain editable. Creating a *client* still needs no package; a package must exist before booking; exhausted → buy another first. |
| Paid-date required when Paid | **Decided 2026-06-28.** In the client package purchase form, checking **Paid** makes **Paid date** required — enforced client-side (`required`) and server-side (`readPayment`), on both create and edit. |
| Payments (offline, Phase 1) | **Decided 2026-06-20.** Stay **offline** — no online gateway in Phase 1 (revisit if the business grows). Record on **`client_packages`** (NOT `service_packages`, which is the price-list): `paid BOOLEAN`, `payment_mode` enum **{paynow, bank_transfer, cash, credit_card}** default `paynow`, `paid_date DATE?`, `created_by`. Boolean only — partial payments/deposits not modelled. |
| Booking outcome processing (EOD/SOD) | **Decided 2026-06-20, build in Step 4.** New bookings are `confirmed` ("booked"); **status never auto-flips**. **EOD** screen resolves *today's* confirmed bookings → completed/cancelled/no_show, then offers *tomorrow's* day-before reminders + GCal retry. **SOD** safety net = a dashboard banner of overdue (`confirmed`, past-dated) bookings that **re-surfaces until resolved** (skippable to open business; self-healing — no cron, UI-driven). Also: booking an **exhausted package (0 remaining) is HARD-BLOCKED**. |
| GCal fail-soft retry queue | **Schema kept, behaviour DEFERRED with the GCal write-API (2026-06-28, §12).** The **`gcal_sync_failures`** table stays in the schema (dormant), but no rows are written and **no EOD/SOD retry sweep / "Retry calendar sync" button is built in the current phase.** Original design (for when GCal is switched on): generic over bookings + calendar_blocks; a failed push writes a row (booking/block still saves); EOD/SOD sweep + per-booking retry button clear it. |
| Privacy Policy + accessibility | **Decided 2026-06-20.** Add a public **Privacy Policy** page (PDPA notice, footer-linked). Apply an **accessibility baseline** on public pages — image alt text, adequate colour contrast (watch the pale palette), visible keyboard-focus outlines. |
| Client deletion | **Decided 2026-06-20 — clients are NEVER deleted.** No delete UI, no soft-delete/anonymize. RESTRICT FKs already block hard deletes; full history is kept deliberately. (The earlier "Delete client" audit row is removed.) |
| Timestamp timezone display | **Decided 2026-06-20.** Prisma keeps storing UTC; the **admin UI converts to SGT and prints an explicit "SGT" label** next to every displayed time (booking times, audit timestamps, etc.) to avoid ambiguity. |
| Staff password recovery | **Decided 2026-06-20.** No self-service "forgot password" (login is username-based, email optional). An **admin resets a staff member's password** via User Management, which sets `must_change_password = true` (same pattern as the seeded bootstrap account). |
| Backup / restore strategy | **Deferred — revisit at the UAT phase (reminder set 2026-06-20).** Neon free tier has limited point-in-time history; for real `main` client data we need a documented restore story (accept Neon's window vs periodic `pg_dump`). Not decided now — flag when setting up UAT/production. |
| CI / automated-test gate (GitHub Actions) | **Planned — set up alongside Vitest at Step 4.** A `.github/workflows/ci.yml` runs `npm test` on push/PR; making it a real gate = a one-time **branch-protection** toggle on `main` (require the check to pass → a failing test blocks the merge to production). Free. **Start unit-tests-only** (no DB); **defer** integration-tests-in-CI (needs a test-DB secret + ephemeral Neon branch). Vitest is a devDependency — not on the live site, never touches real data. See §16. |

---

## 16. Verification Plan

**Automated tests (planned — introduce at the bookings/session-consumption step):** Admin modules through step 3 are verified manually via throwaway integration harnesses (the real server action + Prisma + Neon dev branch, driven over HTTP, then deleted). This confirms correctness at write-time but gives no protection against future regressions. When building the bookings & session-consumption logic, add **Vitest** and: (a) unit-test the extracted pure logic — `sessions_remaining` (non-cancelled bookings consume; `no_show` consumes, `cancelled` frees), **exhausted-package hard-block** (0 remaining ⇒ refuse), FIFO package selection, **time-range overlap detection** (using `scheduled_time` + `duration_minutes` vs other bookings/blocks) including the **midnight rule** (group/overlap by `scheduled_date` keyed off start time; no cross-midnight wrap), **business-hours shading lookup** (which slots are working/non-working), and validation/`slugify` helpers; (b) regression-test the security guards (`requireAdmin`, self-lockout, last-admin backstop, "staff cannot read session notes", **login lockout: 5-fail lock + 60-min auto-unlock + reset-on-success**); (c) add a few integration tests against an ephemeral Neon test branch for the critical action flows — i.e. formalize the throwaway harness into committed, automated tests. Rationale: that math is intricate and costly if wrong, and tests are cheapest to write while the logic is fresh.

**Where tests run (Vitest is a dev tool, not part of the live site):** Vitest is a **devDependency** — it never ships to or runs on the live Vercel site, and never touches real `uat`/`main` client data. Tests run **locally** (`npm test`) and, to guard production, as a **GitHub Actions CI gate** (NOT a per-Vercel-environment install): a small `.github/workflows/ci.yml` runs `npm test` on every push / pull-request, and a one-time **branch-protection** toggle on `main` makes a failing test **block the merge** — that is the "run tests before production" guard. Unit tests need **no database**; the few integration tests use an **ephemeral Neon test branch** via a CI secret (never the real DBs). Plan: **start unit-tests-only CI** (trivial — one file), and **defer integration-tests-in-CI** until it's worth the extra setup. See §15 (CI / test gate).

**Manual walkthrough — after Phase 1 implementation:**
1. Run `next dev` and walk through all public pages
2. Click "Book via Chat" — confirm WhatsApp opens with correct pre-filled message
3. Log in to `/admin` with default admin account — confirm forced password change prompt appears
4. Change password, log back in — confirm access is granted and prompt does not reappear
5. Create a new admin user and a staff user via User Management
6. Admin dashboard — confirm upcoming bookings are fetched from the database and displayed
7. Add a booking via admin panel — confirm it creates an event in Google Calendar
8. Edit a booking in admin — confirm the Google Calendar event updates
9. Delete a booking in admin — confirm the Google Calendar event is removed
10. Add a test client with general notes — confirm notes persist
11. Record a package purchase (e.g. 3-session hypnotherapy) for the test client — confirm it appears with 3 sessions remaining
12. Add bookings against that package one by one — confirm `sessions_remaining` decreases each time, that booking against the package is **hard-blocked once it hits 0** (status stays `active`, does NOT auto-flip to `completed`), and the consumption history (booking dates + statuses) displays correctly
13. Cancel one of those bookings — confirm `sessions_remaining` increases again
14. Mark a confirmed booking as `no_show` — confirm `sessions_remaining` on its package does not change (session stays consumed)
15. Reinstate that no-show booking (edit status back to `confirmed`, update date/time) — confirm `sessions_remaining` is still unchanged and the Google Calendar event moves to the new date/time
16. Add a session note linked to a booking — confirm it appears in the client's session history
17. Log in as a staff user — confirm session notes are not visible; confirm general client notes and package/consumption data are visible
18. Create a blog post, publish it — confirm it appears on the public blog
19. Add a testimonial, mark visible — confirm it appears on the testimonials page
20. Perform any admin action (add client, edit booking) — confirm a row appears in `/admin/audit-log` with correct actor, resource type, summary, and timestamp
21. Log in as staff — confirm `/admin/audit-log` is inaccessible (redirected or 403)
22. Test on mobile (responsive) — confirm hamburger menu and admin panel are usable on small screens
23. **Real-device check (public pages + blog):** open the public site and a blog post on an actual phone (iPhone/Safari and Android/Chrome), not just a resized desktop browser — confirm layout re-flows correctly, the hamburger menu works, text is readable, and blog images (including ones Jennefer resized in the editor) shrink to fit the screen without overflowing. Spot-check on a PC and a Mac browser too. Do this explicitly when the public pages are built rather than assuming it.

**Booking-system specifics (verify at Step 4):**
- **In-person booking** → requires a **venue** (seeded default pre-selected); confirm the venue name/address shows in the GCal event `location` and the confirmation message.
- **Zoom booking** → no venue; `zoom_join_url` defaults to "to arrange manually"; confirm the confirmation says Jennefer will arrange it (and embeds a link only if a real URL is entered).
- **Duration** (snapshot from package, editable) sets the GCal event end and the calendar block's length — confirm a 60-min booking spans 60 min on the calendar and in GCal.
- **Calendar block** (e.g. a multi-day vacation) → shows on the calendar as a banner, pushes a GCal event, and is **not** counted as a client session or against any package.
- **Business-hours shading:** day/week view shades Mon–Fri 9–6 / Sat 9–1 white and the rest light pink; Sunday fully pink; editing business hours updates the shading.
- **Out-of-hours booking:** add an 8pm ad-hoc booking → it renders on pink in the day view **and** is included in the month-view per-day count.
- **Month-view count badge:** each day shows the count of **non-cancelled** bookings (cancel one → count drops).
- **Inline overlap warning:** add a booking overlapping an existing booking/block → the soft warning appears and can be overridden (booking still saves).
- **Roles:** a **staff** user can manage bookings + calendar blocks but is blocked from **Venues** and **Business Hours** (admin-only); confirm the redirect/403.
- **Overbooking hard-block:** select a package with 0 sessions remaining in Add-Booking → it's refused (must pick another package, or record a new purchase — ad-hoc creation is disabled, §15); a package at 0 stays `active` (no auto-`completed`).
- **New booking requires a package:** the New-booking form has no ad-hoc option and pre-selects the client's oldest available package; a client with no sessions-left package shows a "record a purchase first" block and can't submit. Editing an existing (incl. legacy ad-hoc) booking still allows clearing the package.
- **Paid-date required:** in the package purchase form, ticking **Paid** makes **Paid date** required (client- and server-side).
- **Delivery XOR CHECK constraint:** attempt (e.g. via a raw insert / forced form bypass) an in_person booking with no venue, or a zoom booking with a venue → the DB rejects it (constraint), not just the form.
- **Midnight rule (Vitest):** a 23:30 + 60-min booking is counted on its own date and does NOT collide with a 00:15 booking the next day; two bookings at 23:00 and 23:40 on the same date DO overlap-warn.
- **EOD processing:** today's `confirmed` bookings appear for outcome resolution; resolving flips status + writes an audit row; tomorrow's bookings show a "Send reminder" button.
- **SOD safety net:** leave a past booking `confirmed` overnight → next day a dashboard banner lists it; skipping leaves it to re-appear on the following SOD until resolved.
- **GCal retry queue:** simulate a failed push (e.g. GCal stubbed to throw) → booking still saves + a `gcal_sync_failures` row appears; the per-booking "Retry calendar sync" button (and EOD/SOD sweep) clears it on success.
- **Login lockout:** 5 wrong passwords lock the account; it auto-unlocks after 60 min, and an admin can unlock it sooner via User Management; a successful login resets the counter.
- **Generic login errors:** a wrong username and a wrong password produce the *same* error message (no username enumeration).
- **Strong-password enforcement:** the change-password flow rejects a too-short/weak password (e.g. under ~12 chars).
- **Session timeout:** confirm the NextAuth session has a finite `maxAge` (doesn't persist indefinitely).
- **Payment fields:** record a purchase with `paid=false`/`payment_mode=paynow`, later mark paid with a `paid_date` → persists and audit-logs; `created_by` captures who recorded it.
- **Timezone display:** booking times and audit timestamps render in **SGT with an explicit "SGT" label**.
- **Privacy Policy + a11y:** the Privacy Policy page loads and is footer-linked; spot-check public-page alt text, colour contrast, and visible keyboard-focus outlines (tab through with no mouse).
