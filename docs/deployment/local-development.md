# Local Development

## Prerequisites

- Node 24, matching CI and current dependency requirements.
- No `psql` or Supabase CLI required — SQL is applied with a Node script.

## Setup

```bash
npm ci
cp .env.example .env.local   # fill in Supabase + optional Resend
npm run dev
```

Without Supabase env vars public data helpers run in **demo mode** with sample
data. Authenticated write and staff workflows require Supabase.

## Database changes

Migrations live in `supabase/migrations/*.sql`, applied in order:

```bash
node scripts/db-apply.mjs supabase/migrations/00012_email_delivery_events.sql --check
node scripts/db-apply.mjs supabase/migrations/00012_email_delivery_events.sql
```

`db-apply.mjs` uses `DIRECT_URL` from `.env.local`, takes an advisory lock,
runs one transaction, and records a version/checksum. Never edit an applied
migration. Seed sample data with
`node scripts/db-apply.mjs supabase/seed.sql`.

Grant yourself admin after signing in once:

```bash
node scripts/grant-admin.mjs you@example.com
```

## Checks before pushing

```bash
npm run check
npm run test:e2e
npm run build
npm run test:rls   # needs DIRECT_URL; skips otherwise
```

## Notes

- Next 16 refuses a second dev server for the same directory. If port 3000 is
  taken by your own `npm run dev`, reuse it rather than starting another.
- The bundled Next docs in `node_modules/next/dist/docs/` are the source of
  truth for framework conventions in this version.
