# Production Deployment

Canonical origin: `https://spaces.dzaleka.com`

## Preconditions

- Reviewed release commit and green CI: format, lint, typecheck, content/UI
  guard, unit, production build, desktop/mobile Playwright/axe, RLS and
  high-severity dependency audit.
- Current database and four storage-bucket backups plus a tested rollback plan.
- Migrations validated with `--check`; checksum changes to an applied migration
  are prohibited. Create a new migration instead.
- DPIA, terms, privacy/retention and safeguarding owner sign-off.
- Named release operator, incident owner and rollback decision maker.

## Required environment

```text
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://spaces.dzaleka.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM=
EMAIL_REPLY_TO=
NOTIFICATION_WORKER_SECRET=
```

`DIRECT_URL` belongs in the controlled migration/test environment, not browser
runtime. `validateRuntimeEnvironment()` stops production startup when required
values are absent or the worker secret is shorter than 32 characters.

## Database release

1. Capture database and storage backup references.
2. Validate each unapplied migration:

   ```bash
   node scripts/db-apply.mjs supabase/migrations/00012_email_delivery_events.sql --check
   ```

3. Apply each migration in numeric order:

   ```bash
   node scripts/db-apply.mjs supabase/migrations/00012_email_delivery_events.sql
   ```

4. Confirm `app_schema_migrations` has the expected version/checksum.
5. Run `npm run test:rls` against production. The suite rolls back its mutation
   checks.

## Application release

1. Deploy the same reviewed commit to Render.
2. Confirm the platform reports a healthy deployment before switching traffic.
3. Verify DNS/TLS through Cloudflare and the canonical redirect policy.
4. Confirm response headers: nonce CSP, HSTS, `nosniff`, frame denial,
   permissions/referrer policy and no `X-Powered-By`.
5. Confirm `/robots.txt`, `/sitemap.xml` and canonical metadata reference
   `https://spaces.dzaleka.com`.
6. Confirm authenticated portals are `noindex` and unauthorised role requests
   redirect/reject correctly.

## Resend and scheduler

1. Verify the sending domain, SPF, DKIM and DMARC; use a monitored reply
   address and disable open/click tracking for transactional messages.
2. Register `https://spaces.dzaleka.com/api/webhooks/resend` for sent,
   delivered, delayed, bounced, failed, complained and suppressed events.
3. Store its `whsec_...` secret as `RESEND_WEBHOOK_SECRET`.
4. Send only to an owned address or a Resend test address during verification.
5. Schedule `POST https://spaces.dzaleka.com/api/jobs/process-notifications`
   with `Authorization: Bearer $NOTIFICATION_WORKER_SECRET`.
6. Verify queue claim, send, webhook update, replay deduplication and failed
   delivery appearance in `/admin/notifications/failures`.

## Post-release smoke

Use the ten-step smoke test in `docs/production-readiness.md`. At minimum:

- public search/services/info/auth pages render at desktop and mobile widths;
- a complete non-residential listing can be assigned, verified and published;
- exact location/evidence remains anonymous-inaccessible;
- dual confirmation is required before a receipt exists;
- maintenance participant files remain private;
- email worker and signed webhook complete without duplicates.

## Monitoring window

For the first hour monitor application errors, HTTP 5xx, auth failures, DB
connections/capacity, notification queue depth/failures, webhook failures,
upload quarantine backlog and urgent moderation cases. Keep the prior
application deployment available until the window closes.

## Stop and rollback

Stop traffic or roll back when a protected flag is enabled, private data is
public, staff MFA is bypassed, finance history mutates, migrations/checks fail,
or error rate exceeds the agreed threshold. Follow
`docs/deployment/rollback.md`; do not reverse an irreversible data migration by
guessing.
