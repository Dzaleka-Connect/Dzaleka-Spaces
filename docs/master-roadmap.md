# Master Roadmap

This file records the full roadmap from the master development prompt. It is
intentionally broader than the current MVP implementation. Use
`docs/roadmap.md` for current build status and this file for the complete
production target.

## Product Boundary

- Dzaleka Spaces is a space-discovery and occupancy-management platform for
  Dzaleka Refugee Camp.
- It supports discovery, comparison, saved searches, enquiries, viewings,
  occupancy records, payment records, receipts, maintenance, service-provider
  workflows, reports, administration and low-connectivity field verification.
- It must never support land sales, shelter sales, ownership certificates,
  legal-title claims, automated eviction, public refugee IDs or public exact
  household coordinates.
- Verification means a field representative checked the listing details and
  provider's stated authority to offer the space. It never confirms ownership.
- The pilot must not hold funds. Payment features are immutable records and
  receipts unless a separately approved payment-provider integration is
  configured.

## Completion Standard

A feature is complete only when:

- The page or workflow is implemented with real functionality.
- The database schema and migrations exist.
- RLS and server-side permission checks enforce access.
- Validation, loading, empty, error and permission states exist.
- Relevant audit events are recorded.
- Critical tests cover the workflow.
- Documentation explains operation and deployment.

The final product must not contain placeholder pages, fake metrics,
non-functional buttons, mock authentication, unprotected private storage,
silently swallowed errors, fake payment confirmations, unimplemented
navigation links or "coming soon" pages for required scope.

## Application Surfaces

The complete product has six connected surfaces:

- Public marketplace.
- Seeker and occupant account.
- Space-provider portal.
- Field-verifier PWA.
- Maintenance-service-provider portal.
- Administration portal.

Every listed route below needs real functionality before the full master prompt
can be called complete.

## Public Marketplace

Required routes:

```text
/
/spaces
/spaces/map
/spaces/[listing-slug]
/compare
/zones
/zones/[zone-slug]
/categories/[category-slug]
/services
/services/[category-slug]
/service-providers/[provider-slug]
/how-it-works
/verification
/list-a-space
/request-assisted-listing
/safety
/help
/help/[article-slug]
/about
/pricing
/partners
/contact
/terms
/privacy
/community-guidelines
/listing-rules
/accessibility
/sign-in
/register
/forgot-password
/reset-password
```

Required capabilities:

- Homepage with main search, category browsing, recently verified spaces,
  browse-by-zone, verification explanation, safe-viewing guidance, provider
  onboarding, assisted-listing option, local service providers and help.
- Search by keyword, zone, landmark, category, amount range, billing period,
  availability date, rooms, private/shared, water, sanitation, electricity,
  solar, cooking, furnished, accessibility, verification status, recent
  confirmation and intended use.
- Sorting by relevance, recency, amount, verification recency and availability.
- URL-backed filters, pagination, empty results, clear filters, saved search,
  search alert, list/map switch, result count and privacy-safe analytics.
- Listing detail with gallery, amount, deposit, availability, public location,
  facilities, rules, verification state, provider profile, approximate map,
  similar listings, safety notice and report action.
- Actions for save, compare, share, enquiry, viewing request and approved
  contact channels.
- Saved search alerts with naming, channel, frequency, pause, review and
  delete.

## Seeker and Occupant Portal

Required routes:

```text
/account
/account/profile
/account/security
/account/sessions
/account/saved-spaces
/account/saved-searches
/account/enquiries
/account/enquiries/[id]
/account/viewings
/account/viewings/[id]
/account/occupancies
/account/occupancies/[id]
/account/charges
/account/payments
/account/payments/[id]
/account/maintenance
/account/maintenance/new
/account/maintenance/[id]
/account/documents
/account/messages
/account/notifications
/account/privacy
/account/help
```

Required capabilities:

- Dashboard with saved-listing updates, saved-search matches, active
  enquiries, upcoming viewings, current occupancy, upcoming charges,
  payment-confirmation requests, maintenance requests, unread messages and
  notifications.
- Enquiry threads with listing context, permitted attachments, provider
  response, viewing request, close/withdraw, block/report and audit trail.
- Viewings with request time, provider response, alternatives, confirmation,
  cancellation, reminders, authorised directions release, calendar file,
  outcome and safety check-in.
- Occupancies with parties, terms, deposit record, notice period, services,
  payment schedule, documents, notices, maintenance, messages and history.
- Payment record ledger for cash, Airtel Money, TNM Mpamba, DzalekaPay
  reference, bank transfer, organisation payment and other approved methods.
- Payment records require payer confirmation, provider confirmation, unique
  external references where applicable, receipts, adjustments and disputes.

## Space-Provider Portal

Required routes:

```text
/provider
/provider/profile
/provider/spaces
/provider/spaces/new
/provider/spaces/[id]
/provider/spaces/[id]/edit
/provider/listings
/provider/listings/new
/provider/listings/[id]
/provider/listings/[id]/edit
/provider/listings/[id]/preview
/provider/verifications
/provider/verifications/[id]
/provider/enquiries
/provider/enquiries/[id]
/provider/viewings
/provider/viewings/calendar
/provider/viewings/[id]
/provider/occupancies
/provider/occupancies/new
/provider/occupancies/[id]
/provider/charges
/provider/charges/new
/provider/payments
/provider/payments/new
/provider/payments/[id]
/provider/deposits
/provider/maintenance
/provider/maintenance/[id]
/provider/work-orders
/provider/work-orders/[id]
/provider/expenses
/provider/documents
/provider/messages
/provider/reports
/provider/team
/provider/settings
```

Required capabilities:

- Dashboard with real counts for spaces, listings, verification work,
  enquiries, viewings, occupancies, charges, payment confirmations, confirmed
  payments, balances and maintenance.
- Multi-step space creation: category, zone, landmark, public approximate
  location, private exact location, facilities, capacity, accessibility,
  authority to offer, evidence, media and review.
- Multi-step listing creation: select space, title, description, amount,
  billing period, deposit, availability, permitted use, rules, media selection,
  enquiry preferences, preview and submit.
- Draft saving and publication blocking until verification and moderation
  requirements are met.
- Provider team permissions for view-only, spaces, listings, enquiries,
  viewings, occupancies, payments, maintenance, reports and full manager.

## Field-Verifier PWA

Required routes:

```text
/verifier
/verifier/assignments
/verifier/assignments/[id]
/verifier/assignments/[id]/checklist
/verifier/assignments/[id]/evidence
/verifier/assignments/[id]/complete
/verifier/map
/verifier/offline
/verifier/completed
/verifier/notifications
/verifier/profile
/verifier/security
```

Required capabilities:

- Separate installable verifier PWA.
- Offline assignments, provider contact, directions, checklist, photograph
  capture, private coordinate capture, notes, voice notes where supported,
  local drafts, durable upload queue, retry, sync status, conflict handling and
  secure deletion after upload.
- Sensitive local records protected by the strongest practical browser
  approach.
- Device re-authentication after a configured inactive period.
- Checklist for provider presence, identity review, authority evidence, space
  existence, category, zone, landmark, private coordinates, image match, water,
  sanitation, electricity, accessibility, amount, deposit, availability, safety
  concerns, conflicting claims, provider confirmation and verifier declaration.
- Verifier recommendations: confirmed, changes required, unable to verify,
  conflicting authority, safety escalation or supervisor review required.
- Verifiers never publish listings; supervisor/moderator review decides.

## Maintenance-Service Portal

Required routes:

```text
/trades
/trades/profile
/trades/jobs
/trades/jobs/[id]
/trades/quotes
/trades/quotes/new
/trades/quotes/[id]
/trades/work-orders
/trades/work-orders/[id]
/trades/schedule
/trades/messages
/trades/reviews
/trades/documents
/trades/settings
```

Required capabilities:

- Service categories for repairs, carpentry, electrical, plumbing, roofing,
  painting, cleaning, solar, water systems, locks/security and other approved
  services.
- Service providers can create profiles, choose categories and zones, add
  languages and verified contact information, add work examples, receive jobs,
  submit quotes, accept work orders, schedule work, upload progress, record
  materials, upload completion evidence, receive reviews and report problems.
- Exact work locations are hidden until assignment.

## Administration Portal

Required routes:

```text
/admin
/admin/review
/admin/spaces
/admin/spaces/[id]
/admin/listings
/admin/listings/[id]
/admin/verifications
/admin/verifications/calendar
/admin/verifications/[id]
/admin/verifiers
/admin/verifiers/[id]
/admin/users
/admin/users/[id]
/admin/providers
/admin/providers/[id]
/admin/organisations
/admin/organisations/[id]
/admin/occupancies
/admin/occupancies/[id]
/admin/charges
/admin/payments
/admin/payments/[id]
/admin/deposits
/admin/adjustments
/admin/receipts
/admin/maintenance
/admin/maintenance/[id]
/admin/work-orders
/admin/service-providers
/admin/service-providers/[id]
/admin/cases
/admin/cases/[id]
/admin/locations/zones
/admin/locations/zones/[id]
/admin/locations/landmarks
/admin/locations/landmarks/[id]
/admin/content/pages
/admin/content/help
/admin/content/announcements
/admin/content/translations
/admin/notifications
/admin/notifications/templates
/admin/notifications/failures
/admin/analytics
/admin/reports
/admin/settings/general
/admin/settings/listings
/admin/settings/verification
/admin/settings/payments
/admin/settings/privacy
/admin/settings/retention
/admin/settings/feature-flags
/admin/settings/roles
/admin/audit
/admin/system
```

Required capabilities:

- Operational dashboard for listings awaiting review, verification visits,
  pending decisions, authority conflicts, public media approvals, reports,
  payment disputes, failed notifications, maintenance, urgent cases, stale
  listings and system health.
- Review workspace showing submitted listing, space record, authority
  evidence, verification evidence, public media, risk flags, provider history,
  reports, notes and audit history.
- Review actions: approve, request changes, reject, pause, suspend, escalate,
  reassign and set verification expiry.
- Case management for false listings, unauthorised listings, duplicates,
  payment/deposit disputes, unsafe conditions, privacy issues, harassment,
  discrimination, misleading information, service-provider issues,
  protection-sensitive concerns and other cases.
- Protection-sensitive cases require stricter access policy than ordinary
  moderation cases.

## Data And Workflow Domains

Required database domains:

- Identity and access.
- Reference data.
- Spaces and listings.
- Search and engagement.
- Verification.
- Occupancy.
- Financial records.
- Maintenance.
- Moderation and cases.
- Platform operations.

Required constraints:

- Full RLS on protected tables.
- Explicit grants and policies for every exposed table or view.
- Public reads through sanitised views/RPCs, not private base tables.
- One active exclusive occupancy per space.
- Unique external payment references per provider.
- No residential publication while gated flags are disabled.
- No exact location or private evidence in public views.
- Route middleware is never the sole access-control boundary.

Required storage buckets:

```text
listing-public
verification-private
provider-private
occupancy-private
maintenance-private
case-private
user-private
```

Storage must enforce RLS, file validation, malware scanning where integrated,
EXIF/GPS stripping for public images, signed URLs for private content and
separate backup/export because database backups do not include uploaded files.

## Core Workflows

- Listing workflow: draft, submitted, assigned verification, verifier
  checklist, supervisor/moderator review, approved/published or
  changes/rejected/suspended, with notifications and audit events.
- Enquiry/viewing workflow: enquiry, provider notification, response,
  viewing request, confirmation, authorised directions release, reminders,
  outcome and possible occupancy creation.
- Occupancy workflow: provider creates record, parties confirm, documents are
  generated, charges scheduled, notices/history recorded and termination
  handled without eviction tooling.
- Payment ledger: immutable charges, records, allocations, confirmations,
  receipts, disputes, adjustments, decimal-safe MWK storage, partial payments,
  overpayments and idempotent external adapters.
- Maintenance workflow: ticket, media, triage, quote, work order, schedule,
  progress, completion evidence, confirmation, review and problem reporting.
- Notifications: email, SMS, WhatsApp and web push adapters with preferences,
  templates, queues, delivery logs, retries and no sensitive lock-screen
  content by default.

## Platform Requirements

- Privacy/data protection: data minimisation, purpose limitation, access logs,
  retention, export, deletion/anonymisation where legal, DPIA template and
  pre-launch compliance review.
- Security: strict CSP, secure headers, CSRF protection, validation,
  sanitisation, rate limits, bot controls, upload controls, MFA for staff,
  step-up auth for sensitive actions, dependency scanning and threat model.
- Audit logging: append-only events for sign-in, role changes, listing state,
  verification, publication, private data access, payments, cases, flags,
  exports and failed authorisation.
- Internationalisation: English plus Dzaleka-relevant language support, with
  translated user-facing strings and document templates.
- Low-connectivity: installable PWA, offline page, reduced payloads, retryable
  mutations, connection indicators and essential public content without
  JavaScript where practical.
- Accessibility: WCAG-minded keyboard support, labels, focus states,
  contrast, reduced motion and mobile usability.
- Performance: mobile budgets, no admin code on public pages, query tuning,
  image optimisation and caching where safe.
- SEO/sharing: metadata, Open Graph, structured data, canonical URLs,
  indexable public category/zone pages and no indexing of account workflows.
- Analytics: privacy-safe events with validated schemas and no private
  locations or identity evidence.
- Observability: structured logs, request IDs, error monitoring, uptime,
  queue/job metrics, dashboard queries and incident runbooks.
- Backups/DR: database backups, storage backups, restore tests, documented RPO
  and RTO and rollback process.
- Environment management: typed env config, separate local/staging/production
  settings, separated storage, SMTP/notification config and payment webhooks.
- CI/CD: PR checks, lint/typecheck/build/tests/security scans, staging deploy
  gates and production deployment records.

## Feature Flags

Backend-controlled flags required by the master prompt:

```text
residential_listings
family_accommodation
public_map
assisted_listings
occupancy_records
mobile_money_integrations
payment_processing
deposit_custody
maintenance_marketplace
featured_listings
organisation_accounts
whatsapp_notifications
sms_notifications
saved_search_alerts
public_service_reviews
```

Flags must be enforced server-side and in database workflow functions.

## External Integrations

Adapters are required for:

- Email delivery.
- SMS.
- WhatsApp.
- Web push.
- DzalekaPay.
- Airtel Money.
- TNM Mpamba.
- Map tiles.
- Geocoding.
- Error monitoring.
- Analytics.
- Malware scanning.

Every adapter must include typed configuration, health status, timeout, retry,
idempotency, structured errors, secret-safe logging, disabled state, test
adapter, setup documentation and webhook verification where applicable.

## Documentation Target

Required documentation set:

```text
README.md
docs/architecture/system-overview.md
docs/architecture/data-model.md
docs/architecture/permissions.md
docs/architecture/workflows.md
docs/architecture/integrations.md
docs/security/threat-model.md
docs/security/rls-model.md
docs/security/file-upload-security.md
docs/security/incident-response.md
docs/privacy/data-flow-map.md
docs/privacy/retention-policy.md
docs/privacy/dpia-template.md
docs/deployment/local-development.md
docs/deployment/staging.md
docs/deployment/production.md
docs/deployment/rollback.md
docs/operations/admin-guide.md
docs/operations/verifier-guide.md
docs/operations/backup-and-restore.md
docs/operations/monitoring.md
docs/operations/support-guide.md
```

## Implementation Phases

1. **Foundation**: repository setup, shared config, Supabase local
   development, migrations, auth, roles, permissions, reference data, audit
   system and CI baseline.
2. **Marketplace**: spaces, listings, public search, listing details, saved
   listings, saved searches, public content and SEO.
3. **Provider workflows**: provider dashboard, space creation, authority
   evidence, listing workflow, provider team, enquiries and viewings.
4. **Verification**: assignment workflow, verifier PWA, offline storage,
   synchronisation, supervisor review and publication.
5. **Occupancy and financial records**: occupancies, confirmations, charges,
   payment ledger, receipts, documents and disputes.
6. **Maintenance**: tickets, service-provider directory, quotes, work orders,
   completion and reviews.
7. **Administration**: review queues, users, locations, cases, financial
   administration, content, notifications, reports and system health.
8. **Hardening**: RLS review, threat-model review, accessibility review,
   performance review, cross-browser testing, backup restoration test,
   production runbooks and deployment gates.

## Definition Of Done

Do not describe the application as complete until:

- All required pages exist and all navigation works.
- Forms save real records.
- Role dashboards use real database data.
- Publication, verification, search, saved search, enquiry, viewing,
  occupancy, payment, maintenance, case and admin workflows work.
- RLS and private storage policies are tested.
- MFA, audit, rate limits, upload controls, security headers, dependency scans
  and threat-model mitigations are in place.
- Type check, lint, build, unit, database, RLS, integration, E2E and
  accessibility checks pass.
- Critical mobile and constrained-connectivity workflows are tested.
- Staging/production deployment workflows, monitoring, alerts, backups,
  restore tests, environment validation and runbooks exist.
- Setup, architecture, permissions, workflows, deployment, privacy controls
  and admin operations are documented.
