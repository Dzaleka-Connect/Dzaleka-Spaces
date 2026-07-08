# Dzaleka Spaces Agent Notes

This file mirrors the operational guidance in `AGENTS.md` for Claude-based
agents. Keep both files aligned when product constraints, workflow rules or
database conventions change.

## Product boundaries

- Do not build land sales, shelter sales, ownership certificates or ownership
  claims. Use "space provider" and "authority to offer", never landlord/title
  language.
- The pilot records payments only. Do not enable fund custody, deposit
  processing or mobile-money processing.
- Residential categories are present in the database enum but publication is
  blocked until written operational guidance authorises the pilot.
- Public location data is approximate: zone plus landmark only. Exact
  locations and authority evidence stay in `space_internal` behind staff RLS.

## Current MVP journey

Provider submits a space at `/list-a-space`, a field verifier completes the
checklist at `/verifier/assignments`, a moderator/admin publishes from
`/admin/review`, and seekers browse `/spaces` and send enquiries.

## Stack reminders

- Next.js 16 App Router with `src/` and Turbopack. Read the matching guide in
  `node_modules/next/dist/docs/` before changing framework conventions.
- shadcn/ui base-nova with Base UI primitives. Use
  `render={<Link ... />}` plus `nativeButton={false}` for link buttons, Select
  `items`, and ToggleGroup array values.
- Supabase Auth + Postgres + RLS via `@supabase/ssr`; prefer
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Demo mode must keep public data helpers working when Supabase env vars are
  absent.

## Commands

```bash
npm run dev
npm run lint
npm run build
```

Use `scripts/db-apply.mjs` with `DIRECT_URL` for SQL on this machine; do not
assume `psql` or the Supabase CLI is installed.
