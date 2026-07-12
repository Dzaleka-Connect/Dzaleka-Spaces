<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Dzaleka Spaces

Community space marketplace for Dzaleka Refugee Camp: discover, verify and
manage commercial and community spaces (shops, offices, training rooms,
venues, workshops, storage, approved homestays). Part of the Dzaleka Online
ecosystem (DzalekaPay, Visit Dzaleka, Dzaleka Online Services).

## Hard product constraints — never violate these

- **No land or shelter sales, no ownership claims.** Verification confirms a
  listing's details and the provider's _stated authority to offer_ a space —
  never ownership. Refugees cannot legally own land/property in Malawi.
- **No fund custody during the pilot.** Payments are _recorded_ (ledger),
  never held. `deposit_processing` / `mobile_money_processing` flags stay off.
  DzalekaPay integration is transaction-read reconciliation plus signed
  webhooks only; it never initiates a payment and never auto-confirms a receipt.
- **Email delivery only during the pilot.** Resend email and in-app records are
  supported. SMS, WhatsApp and web push delivery flags stay off.
- **Residential listings are gated.** `room`, `shared_room`,
  `family_accommodation` categories exist in the enum but publication is
  blocked by a database trigger until the `residential_listings` /
  `family_accommodation` feature flags are enabled — which requires written
  operational guidance from authorities. Do not bypass.
- **Location privacy.** Public data shows only zone + landmark. Exact
  locations live in `space_internal` (staff-only RLS). Never expose refugee
  identity documents or exact household coordinates.

## Stack

- Next.js (App Router, `src/` dir, Turbopack) + TypeScript + Tailwind v4
- shadcn/ui, **base-nova style with `base` primitives** — use
  `render={<Link .../>}` + `nativeButton={false}`, NOT radix `asChild`;
  Select needs an `items` prop; ToggleGroup values are arrays. See
  `.agents/skills/shadcn` before writing UI.
- Supabase: Postgres + Auth (email OTP) + RLS. Clients in
  `src/lib/supabase/` (browser/server via `@supabase/ssr`). New-style
  publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- The app runs in **demo mode** (sample data from `src/lib/demo-data.ts`)
  when Supabase env vars are absent. Every data-access helper in `src/lib/`
  must keep working in both modes.
- Canonical production origin: `https://spaces.dzaleka.com`.

## Commands

```bash
npm run dev      # dev server (or use .claude/launch.json preview)
npm run build    # production build — run before finishing any change
npm run lint     # eslint
npm run typecheck
npm run check:content
npm test         # Vitest
npm run test:e2e # Playwright desktop/mobile + axe
npm run test:rls # live, rolled-back database/RLS assertions
```

## Database workflow

- Schema lives in `supabase/migrations/*.sql`; sample data in
  `supabase/seed.sql` (sequential DO block — publication triggers require
  authority records to exist before listings insert).
- No `psql`/`supabase` CLI on this machine. Apply SQL with a Node `pg`
  script against `DIRECT_URL` from `.env.local` (see `scripts/db-apply.mjs`).
- Validate with `--check` before applying. The runner records version and
  checksum in `app_schema_migrations`; never edit an applied migration. Add a
  new numeric migration.
- Tables are NOT auto-exposed to the Data API (Supabase change, Apr 2026):
  every new table needs explicit `GRANT`s plus RLS policies.
- RLS gotchas already solved — don't regress them:
  - `spaces`<->`listings` policy cross-references recurse; use the
    SECURITY DEFINER helpers `owns_space()`, `space_has_published_listing()`.
  - Public verified badge comes from `listing_verified_at()` (definer) so
    verification evidence stays private.
  - UPDATE policies always need `WITH CHECK`; use `(select auth.uid())`.
- The marketplace reads the flattened `public_listings` view (invoker
  rights), never the base tables directly.

## Architecture docs

`docs/` holds the working architecture and operations set. At minimum update
`data-model.md`, `permissions.md`, `workflows.md`, `route-matrix.md`,
`production-readiness.md`, the relevant runbook and `roadmap.md` when schema,
roles, routes or workflows change. They are source material for release review.

## Conventions

- Domain vocabulary: "space provider" (never landlord/owner), "occupancy
  record" (never lease), "authority to offer" (never title/ownership).
- Currency is MWK via `formatMwk()`. Zones come from the `zones` table via
  `getZones()` (static fallback in demo mode) — never hardcode zone lists in
  components.
- Server actions validate + write; pages are server components; client
  components only where interaction demands it.
