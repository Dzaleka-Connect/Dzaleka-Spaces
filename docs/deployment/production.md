# Production

## Pre-flight

- CI green on the release commit.
- Migrations reviewed; know the exact list to apply and their order.
- Backups confirmed recent (database + storage) — see
  `docs/operations/backup-and-restore.md`.
- Feature flags verified: `residential_listings`, `family_accommodation`,
  `deposit_processing`, `mobile_money_processing` **off**.
- Secrets set in the host: Supabase URL + publishable key, `DIRECT_URL`
  (server-only), `RESEND_API_KEY`, `EMAIL_FROM`. No secret in a `NEXT_PUBLIC_`
  var except the URL and publishable key.

## Release

1. Apply migrations to production via `scripts/db-apply.mjs` (transactional).
2. Deploy the release commit.
3. Verify: homepage renders, `npm run test:rls` passes against production,
   security headers present (CSP nonce, HSTS), core journey works.
4. Confirm `pg_cron` jobs are scheduled (expiry, reminders, notification
   drain, log pruning).

## Post-release

- Watch error and notification-delivery rates for the first hour.
- Keep the previous deployment available for rollback.

## Guardrails

- Never run destructive SQL without a fresh backup and a rollback plan.
- Never point staging at the production database.
- Rotate keys immediately if any are suspected leaked.
