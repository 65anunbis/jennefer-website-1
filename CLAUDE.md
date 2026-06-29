# Jennefer Wong website — Claude project guide

Next.js 14 (App Router) admin / booking app for a Singapore hypnotherapy & tarot
practice (`jenneferwong.sg`). Private repo.

## Canonical context (read for depth)
- **Functional spec** → `docs/PLAN.md`
- **Build log, decisions, current state** → `docs/PROGRESS.md` ← keep this updated as work progresses
This file is the quick reference; the `docs/` files hold the detail. Keep CLAUDE.md lean (it is auto-loaded every session).

## Working agreement
- **Describe before acting** — preface each permission-seeking tool call with a one-line plain description of what it does.
- **Commit per sub-step; push only when the user explicitly asks.** Day-to-day work happens on the `dev` branch.
- **Verify with `npm run build` before committing/pushing** — `tsc --noEmit` does NOT run ESLint, but Vercel's `next build` does (e.g. a trailing unused arg fails the build). preview-dev auto-deploys on every push to `origin/dev`.
- **PowerShell `git commit -m` gotcha** — avoid embedded double-quotes and `|` in the message (the shell mangles them); use plain text. End commit messages with the `Co-Authored-By` trailer.

## Architecture conventions (match existing code)
- Admin modules = server actions (`"use server"`, `FormState = { error?: string }`, `requireUser`/`requireAdmin` from `src/lib/auth-helpers`, `recordAudit` from `src/lib/audit`, `revalidatePath` + `redirect`) + `useFormState`/`useFormStatus` client forms sharing `inputClass` / `SubmitButton`; list pages are `force-dynamic`; enums from `@/generated/prisma/enums`.
- Pure, testable helpers live in `src/lib` (`phone`, `sessions`, `datetime`, `business-hours`, `overlap`, `calendar`) — to be unit-tested with Vitest in Step 4.6.
- **Responsive** — tables wrap in `overflow-x-auto` with secondary columns `hidden sm:table-cell`; the two heavy tables (Bookings, Clients) use a **dual layout**: `sm:hidden` cards + `hidden sm:block` table (desktop unchanged). Inputs are 16px on mobile (`globals.css`) to stop iOS auto-zoom.
- `@db.Date` / `@db.Time` stored as UTC wall-clock, read via `getUTC*`; **display in SGT with an explicit "SGT" label**.

## Hard rules / standing decisions
- **Clients are NEVER deleted** (no delete UI / soft-delete). **Session notes are admin-only** (staff never see them).
- **New bookings must consume a package** (decided 2026-06-28) — the New-booking form has no ad-hoc option and pre-selects the client's oldest available package; if none has sessions left, it blocks and points to "Record a purchase". The Edit form still allows clearing the package so legacy/ad-hoc bookings stay editable. (Creating a *client* needs no package.)
- **Do NOT build the blog** until the owner picks renderer A vs B (see `docs/PLAN.md` §12A).
- **Google Calendar write-API is DEFERRED** (`docs/PLAN.md` §12): `src/lib/gcal.ts` + the `gcal_sync_failures` table are dormant scaffolding, excluded from the current build incl. the EOD/SOD retry. Phone visibility will be an **ICS feed** (§12B), prototyped after 4.5 + 4.6.
- Real secrets live in `.env` / Vercel env (gitignored) — never in committed docs. Personal/secret scratch → `CLAUDE.local.md` (gitignored).
- Tests / DB work only against the Neon **dev** branch — never uat/main.

## Tech & commands
- Next.js 14 + Tailwind + Prisma 7.8 (generated client at `src/generated/prisma`, gitignored) + Neon Postgres (all branches in AWS Singapore) + NextAuth (username/password). Vercel runtime region `sin1`.
- `npm run dev` · `npm run build` · `npx prisma …` (CLI uses `DIRECT_URL`).

## Current state
Step **4.5a** (booking CRUD), **4.5b** (month→day calendar) and **4.5c** (WhatsApp confirmation + copy-button panel) DONE and pushed — plus several UI-refinement rounds (mobile card layouts; uniform top+bottom back-nav; list date-period + client-search filters with calendar blocks merged in; calendar year-jump + blocks-this-month; modernized login/change-password with show-password; per-page tab titles `JW-…`; new bookings require a package; clients "Packages"/"Bookings Unused" columns with a red ✕ pill for zero). **IN PROGRESS: 4.5d** — a single `/admin/daily` ("Daily processing") page (sections auto-hide when empty; Refresh button; each row a dynamic deep-link), **no GCal retry**. Steps 1 (migration: `Booking.reminderSentAt`), 2 (`src/lib/daily.ts` pure section logic), 3 (`/admin/daily/actions.ts`) + 4 (the `/admin/daily` page + `DailyButtons.tsx`) DONE; **Step 5 left** = Dashboard "Daily processing" card + SOD overdue banner. Sections: resolve outcomes (today+overdue), send tomorrow's reminders (SOD, one-tap = opens wa.me + stamps `reminderSentAt`), upcoming collisions, completed-without-notes (**admin-only**), exhausted packages → manual "Mark completed", unused-sessions-no-upcoming, unpaid packages. Then **4.6** (Vitest + auth-hardening bundle). Live detail in `docs/PROGRESS.md`.
