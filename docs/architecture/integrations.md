# Integrations

Every external adapter has: typed config from env, a `disabled` state, a
configured-check, structured errors, secret-safe logging, and (where relevant)
idempotency.

## Active

| Integration | Module | Config | Notes |
| --- | --- | --- | --- |
| Supabase | `src/lib/supabase/*` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | DB, auth, storage, realtime |
| Email (Resend) | `src/lib/email/resend.ts` | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Disabled unless key + from set; idempotency key per send |
| Map tiles (OpenStreetMap) | `src/lib/map.ts` | none | Approximate zone/landmark markers only; `public_map` flag |

## Planned (adapter placeholders)

- SMS, WhatsApp, web push — notification channels beyond email.
- DzalekaPay / Airtel Money / TNM Mpamba — payment *references* only, never
  custody; behind `mobile_money_processing` (off).
- Malware scanning on upload.
- Error monitoring (Sentry) and privacy-safe analytics export.

## Rules

- Secrets live only in server env, never `NEXT_PUBLIC_*` (which ships to the
  browser).
- A disabled adapter must degrade gracefully — the app runs in demo mode with
  no Supabase, and queues/records without sending when email is off.
- Webhook receivers must verify signatures and be idempotent.
