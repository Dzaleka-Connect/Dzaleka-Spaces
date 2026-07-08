# Notification Runbook

## Scope

The first notification adapter supports email through Resend. SMS, WhatsApp
and push are intentionally not enabled yet.

## Required Environment

```text
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=
NEXT_PUBLIC_APP_URL=
SUPABASE_SECRET_KEY=
NOTIFICATION_WORKER_SECRET=
```

`SUPABASE_SECRET_KEY` is server-only. Never expose it with a `NEXT_PUBLIC_`
prefix.

## Queue Flow

1. App code inserts into `notification_queue` with an idempotency key.
2. A scheduler calls `POST /api/jobs/process-notifications` with
   `Authorization: Bearer $NOTIFICATION_WORKER_SECRET`.
3. The worker sends pending email via Resend.
4. Delivery attempts are recorded in `notification_deliveries`.
5. Failed attempts retry with exponential backoff and eventually move to
   `failed`.

## Cron

Supabase `pg_cron` schedules saved-search alert enqueueing through
`enqueue_saved_search_alerts()`. The external worker call should be scheduled
by the deployment platform or Supabase cron/edge function once a production URL
is available.

## Triage

- Check `/admin/notifications` for pending or failed queue rows.
- Verify Resend domain authentication: SPF, DKIM and DMARC.
- Confirm `EMAIL_FROM` uses the verified sending domain.
- Confirm the worker secret in the scheduler matches
  `NOTIFICATION_WORKER_SECRET`.
- Do not retry by manually creating duplicate queue rows; use existing
  idempotency keys.
