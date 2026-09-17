# Staging

Staging must mirror production and use its **own** Supabase project — never
share a database, storage bucket or keys with production, and never load real
identity documents or exact household data.

## Environment

- Separate Supabase project (own URL, keys, storage, cron).
- Separate `RESEND_API_KEY` and a staging `EMAIL_FROM` (or leave email
  disabled).
- Host env (Netlify/Vercel/Cloudflare) with staging-scoped variables.
- On Netlify, `NETLIFY=true` automatically configures a compatible allowlist CSP (`script-src 'self' 'unsafe-inline' https://*.netlify.app`), avoiding strict-dynamic hydration blocks while preserving origin boundaries. Override with `CSP_NONCE_ENABLED=true` if using `@netlify/plugin-csp-nonce`.

## Deploy

1. Apply pending migrations to the staging database in order via
   `scripts/db-apply.mjs`.
2. Deploy the branch to the staging host.
3. Run `npm run test:rls` against staging.
4. Smoke the core journey: submit → verify → publish → discover → enquire.
5. Seed representative (non-real) data only.

## Gate to production

- CI green (lint, typecheck, build, RLS tests).
- Migrations reviewed and applied cleanly to staging.
- Feature flags set to the intended production state (residential, deposit and
  mobile-money flags **off**).
