# Roadmap

From the business plan and the frontend/backend architecture docs. The MVP
launches around one journey: provider submits → verifier checks → admin
publishes → seeker discovers and requests a viewing.

The full master-prompt production roadmap is recorded separately in
`docs/master-roadmap.md`. This file tracks the current implementation status
against that larger target.

## Built

- Public marketplace: home, `/spaces` (search/filters/zones from DB),
  `/spaces/map` (approximate zone markers, `public_map` flag), `/spaces/[id]`,
  `/compare`, enquiries (anonymous OK), private listing reports, info pages
  (`/how-it-works`, `/verification`, `/safety`), `/list-a-space` submission
  with authority declaration and optional photo upload (EXIF stripped client-side).
- Auth: email OTP and email/password sign-in (`/sign-in`, `/register`),
  roles (`user_roles`), role-gated portals. Signed-in `/` redirects to the
  role dashboard.
- Seeker portal `/account`: profile, enquiries with threaded messages at
  `/account/enquiries/[id]`, viewings at `/account/viewings`, saved listings,
  saved searches at `/account/saved-searches`.
- Provider portal `/provider`: metrics, listings, enquiries at
  `/provider/enquiries/[id]`, viewings at `/provider/viewings`.
- Verifier `/verifier/assignments`: pending listings, field checklist,
  private evidence photo upload to `verification-private` bucket.
- Admin `/admin`: overview metrics, review queue with
  approve-and-publish / request-changes / reject (audited),
  feature-flag toggles.
- Database: full RLS, publication guards, verifier separation, feature
  flags, zones/landmarks, audit log, PostGIS + trigram indexes,
  storage buckets (`listing-public`, `verification-private`),
  `enquiry_messages`, extended `viewings` workflow, `saved_searches`.
- Occupancy records (Phase 2, flag `occupancy_records`): `occupancies` +
  `occupancy_parties` with both-party confirmation (in-app for linked
  accounts, recorded in-person confirmation otherwise), one live occupancy
  per space, provider lifecycle actions (notice/complete/cancel, audited) at
  `/provider/occupancies`, occupant review + confirm at `/account/occupancy`.
- Public content and discovery pages: `/zones` + `/zones/[slug]` (live
  counts and listings per zone), `/categories/[slug]`, `/register`,
  `/request-assisted-listing` (writes `assisted_listing_requests`, staff-only
  read), `/help` + six article pages, `/about`, `/contact`, `/pricing`,
  `/partners`, `/terms`, `/privacy`, `/community-guidelines`,
  `/listing-rules`, `/accessibility`; four-column footer navigation.
- Account: `/account/profile` (name/phone/WhatsApp/language editing).
- Provider: `/provider/spaces`, `/provider/listings`,
  `/provider/listings/[id]/edit`, `/provider/listings/[id]/preview`,
  `/provider/team` (scoped provider team permissions),
  `/provider/verifications` (status + re-check dates, evidence stays
  internal).
- Admin: `/admin/users` (role grant/revoke, audited, admin-only edits),
  `/admin/audit` (filterable log viewer, admin-only), `/admin/listings`
  (status-filtered directory), `/admin/occupancies` (read-only oversight),
  `/admin/cases`, `/admin/reports`, `/admin/content/pages`,
  `/admin/notifications`, `/admin/analytics`, `/admin/settings`.
- Verifier: `/verifier` (redirect), `/verifier/completed` (own checklist
  outcomes), `/verifier/offline` (service worker-backed offline queue +
  `verifier_sync_events` API).
- Maintenance marketplace (Phase 3, flag `maintenance_marketplace`):
  `/trades`, `/trades/profile`, `/trades/jobs`, `/trades/jobs/[id]`,
  `/trades/quotes`, `/trades/quotes/new`, `/trades/quotes/[id]`,
  `/trades/work-orders`, `/trades/work-orders/[id]`, `/trades/schedule`,
  `/trades/messages`, `/trades/messages/[ticketId]`, `/trades/reviews`,
  `/trades/documents`, `/trades/settings`. Maintenance messages, reviews
  after completed work orders, and private document uploads
  (`maintenance-private` bucket) are live.
- Notifications: Resend email adapter, server-only notification outbox,
  protected `/api/jobs/process-notifications`, saved-search enqueue cron
  function, `/admin/notifications`.
- Enquiry messaging polish: private attachments in `message-private`,
  `enquiry_attachments`, signed download route.
- Slug URLs: `listings.slug` and `/spaces/[id-or-slug]` compatibility.
- Hardening/docs: CI workflow, `npm run typecheck`, threat model, DPIA
  template, notification/verifier/backup runbooks.

## Next (in the doc's recommended order)

1. **Occupancy documents** — printable/PDF occupancy record in the five
   languages (English, Chichewa, Swahili, French, Kirundi).
2. **Payment ledger (Phase 2)** — charges, payment records
   (cash/Airtel/TNM/DzalekaPay references), dual confirmation, receipts,
   adjustments. Ledger only — no custody.
3. **Payment ledger integration adapters** — typed disabled adapters for
   DzalekaPay/Airtel/TNM, then ledger-only records and receipts. No custody.
4. **Maintenance depth (remaining)** — richer requester ticket creation UI,
   assignment workflows, and notification digests for maintenance updates.
5. **Testing hardening** — RLS tests, storage policy tests, E2E flows,
   accessibility checks and dependency scanning.
6. **Residential pilot (Phase 4)** — only after written operational
   guidance; flip `residential_listings` flag.

## Deliberately out of scope

Land/shelter sales, ownership certificates, deposit/rent custody, credit
checks, eviction tooling, public exact locations, refugee-ID storage.
