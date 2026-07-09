# Local Development

## Prerequisites

- Node 20.19+, 22.13+ or 24+ (see `package.json` engines).
- No `psql` or Supabase CLI required — SQL is applied with a Node script.

## Setup

```bash
npm ci
cp .env.example .env.local   # fill in Supabase + optional Resend
npm run dev
```

Without Supabase env vars the app runs in **demo mode** with sample data, so
the whole UI is browsable immediately.

## Database changes

Migrations live in `supabase/migrations/*.sql`, applied in order:

```bash
node scripts/db-apply.mjs supabase/migrations/00007_operations_marketplace.sql
```

`db-apply.mjs` uses `DIRECT_URL` (session-mode pooler) from `.env.local` and
runs the file in a single transaction. Seed sample data with
`node scripts/db-apply.mjs supabase/seed.sql`.

Grant yourself admin after signing in once:

```bash
node scripts/grant-admin.mjs you@example.com
```

## Checks before pushing

```bash
npm run lint
npm run typecheck
npm run build
npm run test:rls   # needs DIRECT_URL; skips otherwise
```

## Notes

- Next 16 refuses a second dev server for the same directory. If port 3000 is
  taken by your own `npm run dev`, reuse it rather than starting another.
- The bundled Next docs in `node_modules/next/dist/docs/` are the source of
  truth for framework conventions in this version.
