# Email Notification Runbook

## Scope

Transactional email is sent through Resend. In-app rows remain available to
signed-in recipients. SMS, WhatsApp and web push are disabled in application
configuration and locked by a database trigger.

## Configuration

```text
NEXT_PUBLIC_APP_URL=https://spaces.dzaleka.com
SUPABASE_SECRET_KEY=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM=
EMAIL_REPLY_TO=
NOTIFICATION_WORKER_SECRET=
```

`EMAIL_FROM` must use a verified domain. `EMAIL_REPLY_TO` must be monitored.
Configure SPF, DKIM and DMARC, and disable open/click tracking for transactional
messages.

## Queue flow

1. Application code inserts a fully rendered `notification_queue` row with a
   unique event/entity idempotency key.
2. Scheduler calls `POST /api/jobs/process-notifications` with the worker
   bearer secret.
3. `claim_notification_batch()` claims up to 100 ready rows with row locks and
   `SKIP LOCKED`. Concurrent workers cannot claim the same row.
4. Resend receives the queue idempotency key and message tags (`template`,
   `queue_id`).
5. Attempt outcome and provider message ID are written to
   `notification_deliveries`.
6. Retryable sends return to pending with exponential backoff; the fourth
   failed attempt becomes failed.

## Delivery webhook

Register:

```text
POST https://spaces.dzaleka.com/api/webhooks/resend
```

Select `email.sent`, `email.delivered`, `email.delivery_delayed`,
`email.bounced`, `email.failed`, `email.complained`, and `email.suppressed`.

The route reads the raw body, requires all Svix headers, verifies the signature
with the Resend SDK and only then calls a service-role RPC. Svix event IDs are
primary keys in `email_delivery_events`; replay returns success without
changing state twice. Bounce, complaint, suppression and failure mark the
delivery and queue row failed.

Never disable signature verification for local testing. Use a tunnel and the
real Resend test/replay function.

## Scheduler

- Drain interval: start at one minute; adjust only from measured queue volume
  and Resend rate limits.
- Send batch: default 20; maximum 100 claimed rows.
- Request timeout/retry: deployment scheduler should retry transient HTTP
  failure but use the same queue rows, never enqueue duplicates.
- Alert: worker non-2xx, queue oldest pending age, failed row count and webhook
  non-2xx.

## Verification test

1. Use `delivered@resend.dev` or an address owned by the operator.
2. Enqueue one message with a unique test idempotency key.
3. Trigger the worker once and confirm queue `sent`, one delivery row and a
   provider message ID.
4. Confirm signed `email.delivered` creates one event and delivery status
   `delivered`.
5. Replay the webhook and confirm event count remains one.
6. Repeat with `bounced@resend.dev`; confirm failed state and admin failure
   visibility. Do not use fabricated addresses at public email providers.

## Triage

| Symptom            | Checks                                                                | Action                                                       |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Queue not draining | Scheduler auth, worker secret length/match, service key, feature flag | Restore configuration; do not manually mark sent             |
| 429/rate limit     | Queue attempts and next time, Resend rate                             | Allow backoff; lower batch/worker concurrency                |
| 400/422            | Sender, recipient, subject/body, domain                               | Correct template/config; do not retry unchanged payload      |
| 401/403            | API key and verified domain                                           | Rotate/fix secret; treat as configuration incident           |
| Webhook 400        | `RESEND_WEBHOOK_SECRET`, raw body, Svix headers                       | Correct dashboard/environment secret; replay after fix       |
| Bounces/complaints | Delivery event, suppression list, source workflow                     | Stop sends to affected address; review consent/content       |
| Duplicate concern  | Queue idempotency key, provider event ID                              | Do not create a replacement row until records are reconciled |

## Incident data handling

Do not place exact locations, identity evidence, case detail or full message
content in email subjects. Logs may contain queue/event IDs and redacted error
categories, not API keys, webhook secrets or complete recipient lists.
