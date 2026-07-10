# Release Roadmap

Updated: 10 July 2026

This is the release-control roadmap. The original feature inventory remains in
`docs/master-roadmap.md`; route-level ownership is in `docs/route-matrix.md`.

## Current release baseline

The required non-residential pilot surface is implemented:

- Public discovery: keyword and advanced URL-backed filters, sorting,
  pagination, slug URLs, listing comparison, zone/category pages, privacy-safe
  approximate map, saved spaces/searches, service directory, reports,
  enquiries, private attachments, and public guidance/legal content.
- Account: profile/security/session controls, enquiries/messages, viewings,
  calendar export, authorised directions, safety check-ins, occupancy records,
  charges, dual-confirmed payment records and receipts, disputes, maintenance,
  documents, notifications, privacy requests, and help.
- Provider: spaces/listings, edit/preview, authority and media submission,
  verification status, enquiries, viewings/calendar, occupancy records,
  idempotent charges/payments, deposits, maintenance/work orders, expenses,
  documents/messages/reports, team permissions, and settings.
- Verifier: assigned-only field work, MFA gate, complete checklist,
  coordinates/photos/voice notes, image metadata removal, quarantine registry,
  encrypted IndexedDB queue, retryable ordered sync, inactivity lock, secure
  local deletion, assignment history, map, notifications, and profile/security.
- Maintenance services: public service profiles plus role-gated jobs, quotes,
  work orders, schedule, messages, private documents, completion evidence,
  reviews, problem reports, profile, and settings.
- Administration: review/publication state machine, assignment calendar,
  users/providers/verifiers/organisations, listing and space records,
  occupancy/payment/receipt/adjustment oversight, maintenance, cases,
  locations, content, notification templates/failures, analytics, reports,
  settings, audit, and system health.
- Platform: staff MFA, append-only audit and finance records, RLS, private
  storage, upload quarantine, email queue, Resend idempotency and signed
  delivery events, service worker/offline page, environment validation,
  metadata/robots/sitemap, strict security headers, unit/browser/a11y/RLS
  tests, and CI supply-chain checks.

## Release gates

These are operational gates, not unimplemented application pages:

1. Deploy the current release to `https://spaces.dzaleka.com` and confirm the
   generated build identifier and headers match the release commit.
2. Set `APP_ENV=production`, all Supabase variables, Resend variables, and the
   32+ character worker secret in the hosting environment.
3. Register `https://spaces.dzaleka.com/api/webhooks/resend`, select delivery
   and failure events, and verify a signed staging event reaches the database.
4. Schedule notification draining and database housekeeping with monitored
   failure alerts.
5. Require every moderator, administrator, finance user, and field verifier to
   enrol TOTP before operational access.
6. Complete a database and storage restore drill and record measured RPO/RTO.
7. Run a supervised end-to-end pilot rehearsal with provider, verifier,
   moderator, seeker/occupant, and service-provider accounts.
8. Complete DPIA, safeguarding, retention, terms, privacy, and operational
   sign-off by the named responsible people.

## Deliberately disabled

- Residential and family accommodation publication, pending written guidance
  and a separately reviewed database migration.
- Platform fund custody, deposit processing, mobile-money initiation, and
  automated payment verification. The release records external transactions
  only.
- SMS, WhatsApp, and web push notification delivery. Email and in-app records
  are the only enabled channels.
- Land/shelter sales, ownership certificates, title claims, credit checks,
  eviction tooling, public exact locations, and refugee identity storage.

## Post-pilot change control

Future work is admitted only through a reviewed change proposal with product,
protection, privacy, security, migration, rollback, and test evidence. Enabling
a protected flag requires a new migration; the admin UI cannot bypass locked
pilot boundaries.
