# Dzaleka Spaces

Production: [spaces.dzaleka.com](https://spaces.dzaleka.com)

Dzaleka Spaces is a mobile-first community space marketplace and operations
platform for Dzaleka Refugee Camp. It connects public discovery with field
verification, provider operations, occupancy records, an append-only payment
ledger, maintenance services, email notifications, and staff administration.

The core workflow is:

```text
provider submits -> moderator assigns -> verifier checks -> supervisor publishes
-> seeker discovers -> parties enquire, view, document occupancy and maintain records
```

## Non-negotiable boundaries

- The platform does not sell land or shelters and never makes ownership or
  legal-title claims.
- Verification confirms listing details and the provider's stated authority to
  offer a space. It never confirms ownership.
- The pilot does not process or hold money, rent, or deposits. Payments are
  immutable records of transactions made directly between parties.
- Residential publication remains database-blocked until written operational
  guidance authorises a separately reviewed migration.
- Public location is zone plus landmark only. Exact coordinates, directions,
  identity review, and authority evidence remain private.
- Notifications are email through Resend plus in-app records. SMS, WhatsApp,
  and web push delivery are locked off.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Turbopack
- Tailwind CSS v4 and shadcn/ui base-nova components
- Supabase Postgres, Auth, Storage, and row-level security
- Resend transactional email with signed delivery webhooks
- Vitest, Playwright, axe-core, ESLint, Prettier, and database/RLS tests

## Local development

Use Node.js 24, matching CI.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Without Supabase variables, public data helpers
use the sample records in `src/lib/demo-data.ts`. Authenticated write workflows
require Supabase.

Copy `.env.example` to `.env.local` for a connected environment. Server-only
keys must never use a `NEXT_PUBLIC_` prefix.

## Environment contract

Production and staging fail at startup when required configuration is missing.

| Variable                               | Scope         | Purpose                                                      |
| -------------------------------------- | ------------- | ------------------------------------------------------------ |
| `APP_ENV`                              | Server        | `local`, `test`, `development`, `staging`, or `production`   |
| `NEXT_PUBLIC_APP_URL`                  | Public        | Canonical origin; production is `https://spaces.dzaleka.com` |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public        | Supabase project URL                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public        | Supabase publishable key                                     |
| `SUPABASE_SECRET_KEY`                  | Server        | Notification worker and signed webhook writes                |
| `DIRECT_URL`                           | Operator only | Transactional migration and database test connection         |
| `RESEND_API_KEY`                       | Server        | Transactional email API                                      |
| `RESEND_WEBHOOK_SECRET`                | Server        | Signature verification for Resend events                     |
| `EMAIL_FROM` / `EMAIL_REPLY_TO`        | Server        | Verified sender and monitored reply address                  |
| `NOTIFICATION_WORKER_SECRET`           | Server        | Bearer token for the queue worker endpoint                   |
| `DZALEKAPAY_RECONCILIATION_ENABLED`    | Server        | Explicit gate for read-only transaction reconciliation       |
| `DZALEKAPAY_API_KEY`                   | Server        | Scoped `transactions:read` merchant key                      |
| `DZALEKAPAY_WEBHOOK_SECRET`            | Server        | `whsec_` raw-body signature verification secret              |
| `DZALEKAPAY_MERCHANT_ID`               | Server        | Store UUID bound to the key and webhook                      |
| `DZALEKAPAY_BASE_URL`                  | Server        | Optional; defaults to `https://pay.dzaleka.com`              |

## Database setup

Apply migrations in numeric order. `scripts/db-apply.mjs` validates checksums,
uses a transaction and advisory lock, and records applied versions in
`app_schema_migrations`.

```bash
for migration in supabase/migrations/*.sql; do
  node scripts/db-apply.mjs "$migration" --check
  node scripts/db-apply.mjs "$migration"
done
node scripts/db-apply.mjs supabase/seed.sql
```

The current schema ends at:

- `00010_production_hardening.sql`: workflow state machine, staff MFA,
  append-only payment operations, receipts/disputes/adjustments, provider
  permissions, verification assignments/evidence, viewing privacy, admin data.
- `00011_email_only_delivery.sql`: locks non-email delivery and payment
  processing; adds idempotent charge creation.
- `00012_email_delivery_events.sql`: concurrent-safe email queue claims and
  signed, idempotent Resend delivery events.
- `00013_fix_staff_mfa_bootstrap.sql` and
  `00014_grant_storage_helper_execute.sql`: staff bootstrap and storage-policy
  permission corrections.
- `00015_dzalekapay_reconciliation.sql`: read-only DzalekaPay transaction
  reconciliation, signed event deduplication, RLS, and receipt transition guard.

To bootstrap the first administrator after that user has signed in once:

```bash
node scripts/grant-admin.mjs person@example.org
```

## Resend setup

1. Verify the sending domain and configure SPF, DKIM, and DMARC.
2. Use a monitored sender, not a no-reply address.
3. Add `https://spaces.dzaleka.com/api/webhooks/resend` in the Resend dashboard.
4. Subscribe to sent, delivered, delayed, bounced, failed, complained, and
   suppressed email events.
5. Store the webhook signing secret as `RESEND_WEBHOOK_SECRET`.
6. Schedule `POST /api/jobs/process-notifications` with
   `Authorization: Bearer $NOTIFICATION_WORKER_SECRET`.

Queue rows are claimed with `FOR UPDATE SKIP LOCKED`. Resend sends use stable
idempotency keys. Signed provider events are deduplicated before delivery state
is changed.

## DzalekaPay reconciliation setup

Dzaleka Spaces does not create DzalekaPay payments. A party records the
DzalekaPay transaction UUID after paying outside this platform. The server can
then read the transaction and receive signed status events; a completed,
amount-matched result is required before the internal dual-confirmation receipt
can be issued.

1. Create a store-bound key with only `transactions:read` in DzalekaPay.
2. Register `https://spaces.dzaleka.com/api/webhooks/dzalekapay` for
   `transaction.created` and `transaction.updated`.
3. Store the key, one-time `whsec_` secret and store UUID in server-only
   environment variables.
4. Set `DZALEKAPAY_RECONCILIATION_ENABLED=true` only after a signed staging
   event, duplicate replay, amount mismatch and completed transaction pass.
5. Keep `payment_processing`, `mobile_money_processing`,
   `mobile_money_integrations`, `deposit_processing` and `deposit_custody` off.

See [the DzalekaPay runbook](docs/operations/dzalekapay-runbook.md).

## Quality gates

```bash
npm run format:check  # formatting
npm run lint          # Next, TypeScript, React and security lint rules
npm run typecheck     # strict TypeScript
npm run check:content # product vocabulary and UI convention guards
npm test              # Vitest unit tests
npm run test:e2e      # desktop/mobile Playwright + axe checks
npm run test:rls      # live rolled-back RLS and workflow assertions
npm run build         # production compilation and route generation
```

CI runs all checks, the production build, browser tests, and high-severity
dependency auditing. The database suite skips only when its secrets are not
configured.

## Product surfaces

| Surface                  | Primary routes                                                         | Access                           |
| ------------------------ | ---------------------------------------------------------------------- | -------------------------------- |
| Marketplace and services | `/`, `/spaces`, `/services`, `/zones`, `/categories`, help/legal pages | Public                           |
| Account                  | `/account/*`                                                           | Signed-in seeker or occupant     |
| Space provider           | `/provider/*`                                                          | Provider and scoped team members |
| Maintenance trades       | `/trades/*`                                                            | Service provider                 |
| Field verification       | `/verifier/*`                                                          | Assigned verifier with MFA       |
| Administration           | `/admin/*`                                                             | Moderator/admin with MFA         |

Authenticated application surfaces use the responsive sidebar. Public pages
use the compact marketplace header. Portal layouts are excluded from indexing.

## Documentation

- [System overview](docs/architecture/system-overview.md)
- [Data model](docs/data-model.md)
- [Permissions](docs/permissions.md)
- [Workflows](docs/workflows.md)
- [Route matrix](docs/route-matrix.md)
- [Production readiness](docs/production-readiness.md)
- [Release roadmap](docs/roadmap.md)
- [Threat model](docs/security/threat-model.md)
- [DPIA](docs/privacy/dpia-template.md)
- [Production deployment](docs/deployment/production.md)
- [Content and image assets](docs/content-and-assets.md)
- [Operations runbooks](docs/operations)

`AGENTS.md` and `CLAUDE.md` contain mandatory engineering constraints for
future coding agents. Schema, permissions, workflow, security, and operational
changes must update the corresponding documentation in the same change.
