# Integrations

## Active runtime integrations

| Integration                           | Module/route                                   | Configuration                       | Control                                                          |
| ------------------------------------- | ---------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Supabase Auth/Data API/Storage        | `src/lib/supabase/*`                           | URL, publishable key, server secret | Browser/server clients separated; RLS remains authoritative      |
| Supabase Postgres operator connection | `scripts/db-apply.mjs`, `scripts/test-rls.mjs` | `DIRECT_URL`                        | TLS, transaction, advisory lock, checksum ledger, rollback tests |
| Resend send API                       | `src/lib/email/resend.ts`                      | API key, sender, reply address      | Stable idempotency key; structured disabled/error result         |
| Resend delivery webhook               | `/api/webhooks/resend`                         | API key and webhook signing secret  | Raw-body Svix verification; service-only idempotent RPC          |
| DzalekaPay transaction reads          | `src/lib/dzalekapay/*`                         | Store-bound `transactions:read` key | Server-only, 10s timeout, minimal DTO, no automatic POST retry   |
| DzalekaPay transaction webhook        | `/api/webhooks/dzalekapay`                     | Store UUID and `whsec_` secret      | Raw-body HMAC, five-minute window, delivery dedupe, amount guard |
| Render                                | Production Next.js runtime                     | Hosting environment                 | `APP_ENV=production` fail-fast validation                        |
| Cloudflare                            | DNS, TLS and edge transport                    | Operator-managed                    | HTTPS, HSTS and origin/header verification                       |

The public map is a local privacy-safe zone/landmark representation. It does
not send search terms, exact coordinates or user identity to a tile/geocoding
provider.

## Disabled by pilot policy

- SMS, WhatsApp and web push notification delivery.
- DzalekaPay, Airtel Money and TNM Mpamba payment initiation.
- Airtel Money and TNM Mpamba transaction verification.
- Deposit/rent custody or escrow.

All initiation adapters return disabled/failed. DzalekaPay alone supports
server-side read reconciliation for a UUID recorded after an external payment.
It cannot mutate internal confirmation state; database transition guards require
a `completed`, amount-matched provider result before dual confirmation can issue
a receipt. See `docs/operations/dzalekapay-runbook.md`.

## Deployment services

- Error and uptime monitoring: configure the chosen hosting/monitoring service
  with redaction, restricted access and alerts described in the monitoring
  runbook. The app does not require a client-side tracking SDK.
- Malware scanner: consume `file_uploads` rows in `pending` quarantine, scan
  from a private worker, and mark only verified objects `clean`. Until then,
  the restrictive storage policy blocks retrieval.
- Backups: database exports and all storage buckets require separate scheduled
  copies and restore tests.

## Adapter contract

Every integration must have typed configuration, an explicit disabled state,
timeouts, bounded retries, stable idempotency, structured/redacted errors,
health visibility, setup/rollback documentation and signature verification for
incoming webhooks. Secrets remain server-only; only Supabase URL and
publishable key are public.
