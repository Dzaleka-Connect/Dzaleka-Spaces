# System Overview

## Stack

- **Next.js** (App Router, `src/`, Turbopack) — public marketplace + five
  role portals in one modular-monolith app.
- **Supabase** — Postgres + RLS, Auth (email OTP / password), Storage,
  Realtime, `pg_cron`. Accessed via `@supabase/ssr`.
- **Tailwind v4 + shadcn/ui** (base-nova, Base UI primitives).
- **Resend** — transactional email adapter (disabled unless configured).

## Surfaces

Public marketplace · seeker/occupant `/account` · provider `/provider` ·
field-verifier `/verifier` (offline PWA) · maintenance `/trades` ·
administration `/admin`. Role gating is in `src/lib/auth.ts`; the boundary is
RLS.

## Request path

1. `src/proxy.ts` runs on every request: refreshes the Supabase session and
   sets a per-request nonce CSP + security headers.
2. Server components read data through `src/lib/*` helpers, which fall back to
   demo data when Supabase env vars are absent.
3. Mutations go through server actions / route handlers that validate, enforce
   role, write, and record an `audit_events` row.
4. Public reads use the `public_listings` view; private data is RLS-scoped.

## Background work

- `pg_cron` jobs: listing expiry, re-verification reminders, notification
  queue processing, log pruning.
- `/api/jobs/process-notifications` drains `notification_queue` to Resend and
  logs to `notification_deliveries`.

## Key invariants

- No land/shelter sales, no ownership claims, no fund custody in the pilot.
- Residential categories exist but publication is trigger-blocked behind
  feature flags.
- Public data is zone + landmark only; exact locations are staff-only.

See `data-model.md`, `permissions.md`, `workflows.md`, `integrations.md`.
