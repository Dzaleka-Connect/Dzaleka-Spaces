# Roadmap

From the business plan and the frontend/backend architecture docs. The MVP
launches around one journey: provider submits → verifier checks → admin
publishes → seeker discovers and requests a viewing.

The full master-prompt production roadmap is recorded separately in
`docs/master-roadmap.md`. This file tracks the current implementation status
against that larger target.

## Built

- Public marketplace: home, `/spaces` (search/filters/zones from DB),
  `/spaces/[id]`, `/compare`, enquiries (anonymous OK), private listing
  reports, info pages (`/how-it-works`, `/verification`, `/safety`),
  `/list-a-space` submission with authority declaration.
- Auth: email OTP sign-in, roles (`user_roles`), role-gated portals.
- Seeker portal `/account`: profile, own enquiries, saved listings via
  `/account/enquiries` and `/account/saved-spaces`.
- Provider portal `/provider`: metrics, listings with statuses, enquiries.
- Verifier `/verifier/assignments`: pending listings, field checklist
  submission.
- Admin `/admin`: overview metrics, review queue with
  approve-and-publish / request-changes / reject (audited),
  feature-flag toggles.
- Database: full RLS, publication guards, verifier separation, feature
  flags, zones/landmarks, audit log, PostGIS + trigram indexes.

## Next (in the doc's recommended order)

1. **Listing media** — storage buckets (`listing-public`,
   `verification-private`), photo upload in submission + verifier evidence
   capture, EXIF/GPS stripping worker.
2. **Enquiry messaging + viewings** — conversation threads, viewing
   requests/confirmation, staged location release, `/account/viewings`,
   `/provider/viewings`.
3. **Saved searches and alerts** — saved search criteria with notification
   channels (flag: `saved_search_alerts`), plus comparison sharing.
4. **Occupancy records (Phase 2)** — occupancies, both-party confirmation,
   documents in five languages.
5. **Payment ledger (Phase 2)** — charges, payment records
   (cash/Airtel/TNM/DzalekaPay references), dual confirmation, receipts,
   adjustments. Ledger only — no custody.
6. **Maintenance marketplace (Phase 3)** — tickets, service-provider
   profiles (`/trades`), quotes, work orders (flag:
   `maintenance_marketplace`).
7. **Notifications** — Supabase Queues + Cron: expiry, reminders,
   saved-search matches; WhatsApp/SMS/email channels.
8. **Verifier offline PWA** — service worker, offline queue, sync fields
   (client_generated_id etc.), conflict rules.
9. **Map search** — `public_map` flag, approximate markers only.
10. **Residential pilot (Phase 4)** — only after written operational
    guidance; flip `residential_listings` flag.

## Deliberately out of scope

Land/shelter sales, ownership certificates, deposit/rent custody, credit
checks, eviction tooling, public exact locations, refugee-ID storage.
