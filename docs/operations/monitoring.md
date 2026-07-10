# Monitoring

## What to watch

- **Availability** — `https://spaces.dzaleka.com`, `/spaces`, `/services`,
  auth callback and webhook/worker health respond as expected.
- **Errors** — server action / route handler error rate; client console errors.
- **Notifications** — ready/processing age, failed queue rows, delivery state,
  webhook 4xx/5xx and bounce/complaint rate.
- **Cron** — expiry, re-verification, notification drain and log-pruning jobs
  ran on schedule.
- **Database** — connection pool saturation, slow queries, RLS-denied spikes
  (possible probing).
- **Storage** — signed-URL error rate, quarantine age/backlog, unexpected
  public-bucket growth and backup age.

## Signals in the product

- `audit_events` — spikes in publication, role changes or private-data access.
- `analytics_events` — aggregate demand/verification trends (no PII).
- Failed authorisation attempts — watch for BOLA/IDOR probing patterns.

## Health checks

- Synthetic check on `/` and `/spaces`.
- Periodic `npm run test:rls` against production as a live guard assertion.
- Confirm security headers on responses (CSP nonce present, HSTS in prod).
- `/admin/system` checks database queries, server-side worker configuration and
  email adapter configuration without displaying secret values.

## Operator configuration

Configure Render/Cloudflare/Supabase/Resend monitoring with restricted access,
redaction and alerts for the signals above. Record the provider, alert
threshold, escalation destination, named on-call owner and test date in the
production environment record. Avoid client-side session replay or analytics
that could capture exact locations, messages, forms or evidence.
