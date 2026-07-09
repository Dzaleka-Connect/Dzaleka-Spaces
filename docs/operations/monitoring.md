# Monitoring

## What to watch

- **Availability** — homepage and `/spaces` respond 200; auth works.
- **Errors** — server action / route handler error rate; client console errors.
- **Notifications** — `notification_queue` depth and `notification_deliveries`
  failure rate; email disabled-state is expected, hard failures are not.
- **Cron** — expiry, re-verification, notification drain and log-pruning jobs
  ran on schedule.
- **Database** — connection pool saturation, slow queries, RLS-denied spikes
  (possible probing).
- **Storage** — signed-URL error rate; unexpected public-bucket growth.

## Signals in the product

- `audit_events` — spikes in publication, role changes or private-data access.
- `analytics_events` — aggregate demand/verification trends (no PII).
- Failed authorisation attempts — watch for BOLA/IDOR probing patterns.

## Health checks

- Synthetic check on `/` and `/spaces`.
- Periodic `npm run test:rls` against production as a live guard assertion.
- Confirm security headers on responses (CSP nonce present, HSTS in prod).

## To wire before production

- Error monitoring (Sentry adapter placeholder), structured request-ID logs,
  uptime alerts and a queue/job dashboard. Track these in the roadmap.
