# Data model

Schema source of truth: `supabase/migrations/`. This file explains intent.

## Core principle

A **space** is the physical room/shop/venue. A **listing** is an
advertisement for it. They are separate so a space keeps its occupancy,
verification and maintenance history when re-advertised.

## Entities (migrations 00001–00003)

| Table | Purpose | Visibility |
| --- | --- | --- |
| `profiles` | User profile (name, phone, whatsapp, language) | Own + staff; name public when behind a published listing |
| `user_roles` | Role grants (`app_role` enum) | Own + staff; admin manages |
| `zones` | Recognised Dzaleka areas (Kawale 1/2, Likuni 1/2, Lisungwi, Katudza, New Katubza, Zomba, Blantyre, Karonga, Dzaleka Hill, Other) | Public |
| `landmarks` | Curated landmarks per zone | Public |
| `spaces` | Physical space: category, zone_id, landmark text, facilities, capacity | Public when behind published listing; else provider + staff |
| `space_internal` | Exact location (`exact_point` PostGIS geography), authority basis + notes | **Staff only** |
| `listings` | Advertisement: title, price MWK, deposit, billing period, status, featured_until | Published are public; drafts provider + staff |
| `space_media` | Photos (storage paths) | Public when listing published |
| `verifications` | Field-verification records: status, checklist jsonb, verifier, verified_at, reverify_by | Staff + owning provider; public sees only badge via `listing_verified_at()` |
| `enquiries` | Seeker → listing enquiries (anonymous allowed) | Enquirer + listing provider + staff |
| `viewings` | Viewing appointments per enquiry | Follows enquiry |
| `saved_listings` | User bookmarks | Own only |
| `reports` | Safety/dispute reports | Insert by anyone; **read staff only** (protects reporters) |
| `feature_flags` | Backend-controlled gates | Public read, admin write |
| `audit_events` | Append-only audit log with before/after state, request_id | Admin read; staff and participants insert their own rows |
| `occupancies` | Phase 2 arrangement records: terms, dates, amounts (documentation only — no money handled) | Provider, occupant parties, staff |
| `occupancy_parties` | Provider/occupant parties with confirmation state and method (in_app / in_person / staff_assisted) | Same as parent occupancy |
| `provider_team_members` | Scoped provider-team permissions | Provider, member, staff |
| `service_provider_profiles` | Maintenance-service provider profiles | Active public; own + staff |
| `maintenance_tickets` | Maintenance requests/jobs | Requester, assigned service provider, staff; open jobs visible to service providers |
| `maintenance_quotes` | Service-provider quotes | Service provider, requester, staff |
| `maintenance_work_orders` | Assigned maintenance work | Service provider, requester, staff |
| `maintenance_messages` | Ticket message threads | Ticket participants + staff |
| `maintenance_reviews` | Reviews after completed work orders | Requester write; participants + staff read |
| `maintenance_documents` | Private evidence metadata (`maintenance-private` bucket) | Ticket participants + staff |
| `enquiry_messages` | Threaded enquiry messages | Enquiry participants + staff |
| `enquiry_attachments` | Private message attachment metadata | Enquiry participants + staff |
| `notification_queue` / `notification_deliveries` | Email outbox + provider attempts | Recipient own read; admin operations |
| `moderation_cases` / `case_events` | Staff case management | Staff; restricted cases admin/assignee |
| `content_pages` | Database-managed public content | Published public; admin edit |
| `analytics_events` | Privacy-safe event records | Insert public/auth; admin read |
| `verifier_sync_events` | Offline verifier sync events | Verifier own + staff |

## Enums

- `space_category`: community_venue, training_space, meeting_venue, office,
  shop, workshop, storage, homestay, **room, shared_room,
  family_accommodation, other** (residential values publish-blocked by
  feature flag).
- `listing_status`: draft, pending_review, published, paused, archived,
  rejected, submitted, under_review, changes_requested, approved, matched,
  expired.
- `verification_status`: pending, scheduled, approved, rejected, expired.
- `authority_basis`: current_recognised_occupier, organisation_manager,
  venue_operator, family_representative, authorised_agent, other_documented.
- `app_role`: seeker, provider, field_verifier, service_provider,
  organisation_manager, moderator, admin, finance.

## Database-enforced rules

- One published listing per space (`one_published_listing_per_space` unique
  index).
- Publication trigger (`listing_publication_guard`): requires a zone, an
  authority record in `space_internal`, and blocks residential categories
  unless the matching feature flag is enabled.
- `verifier_separation_guard`: a provider can never verify their own listing.
- SECURITY DEFINER helpers that intentionally bypass RLS (all reveal only
  booleans/timestamps): `has_role`, `is_staff`, `owns_space`,
  `space_has_published_listing`, `listing_verified_at`, `feature_enabled`.

## Public read path

The marketplace reads the `public_listings` view (security_invoker), which
flattens listing + space + zone name + provider display name + verified
badge. Client code never queries base tables for public data.

## Remaining entities (see docs/roadmap.md)

Charges/payment_records/receipts/adjustments/disputes (Phase 2 ledger — no
fund custody), organisation accounts and production notification delivery
webhook events.
