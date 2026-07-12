# Data Model

Schema source of truth: `supabase/migrations/*.sql`. Applied versions and
SHA-256 checksums are recorded in `app_schema_migrations` by
`scripts/db-apply.mjs`.

## Core separation

A `space` is the long-lived physical record. A `listing` is one advertisement
for that space. Occupancy, authority review, verification, viewing,
maintenance, and finance history remain attached to the space even when a
listing is archived and replaced.

Exact location and authority evidence are never flattened into the public
listing path.

## Identity and organisations

| Relation                                                                       | Purpose                                         | Access                                                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `profiles`                                                                     | Name, optional contact/language, account status | Own row; authorised staff; limited published provider display through view |
| `user_roles`                                                                   | `app_role` grants                               | Own read; administrator management; audit required                         |
| `user_security_settings`                                                       | Security preferences and state                  | User and authorised staff                                                  |
| `notification_preferences`                                                     | Email/in-app preferences                        | Own row                                                                    |
| `organisations` / `organisation_members`                                       | Organisation status and scoped membership       | Members and staff                                                          |
| `provider_team_members`                                                        | Provider delegates and permission JSON          | Provider, member and staff                                                 |
| `admin_user_directory`, `admin_provider_directory`, `admin_verifier_directory` | Staff-only operational views                    | Moderator/admin with MFA                                                   |

`profiles.account_status` is `active`, `restricted`, `suspended`, or `closed`.
Suspended/closed accounts are routed to security and cannot enter operational
portals.

## Spaces, listings and verification

| Relation                   | Purpose                                                     | Access                                                            |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `zones` / `landmarks`      | Managed approximate public reference data                   | Public read; staff write                                          |
| `spaces`                   | Category, zone, landmark, description, facilities, capacity | Public only through published view; provider/team/staff otherwise |
| `space_internal`           | Exact point, authority basis/notes, restricted evidence     | Staff only                                                        |
| `listings`                 | Advertisement terms and workflow state                      | Published through view; provider/team/staff otherwise             |
| `space_media`              | Public/private media metadata and approval                  | Public only for approved public objects                           |
| `listing_status_history`   | Append-only listing state history                           | Provider/staff according to parent scope                          |
| `verification_assignments` | Assigned verifier, due time, state and result               | Assigned verifier and staff                                       |
| `verifications`            | Checklist, recommendation, supervisor decision and expiry   | Provider sees status; evidence remains staff/private              |
| `verification_evidence`    | File registry link, coordinates/notes and evidence kind     | Assigned verifier and authorised reviewers                        |
| `file_uploads`             | Storage path, MIME, size, scan/quarantine state             | Participants/staff according to parent workflow                   |

`listing_status` includes `draft`, `submitted`, `automated_review`,
`authority_review`, `verification_pending`, `verification_scheduled`,
`verification_completed`, `supervisor_review`, `approved`, `published`,
`changes_requested`, `rejected`, `paused`, `matched`, `stale`, `expired`,
`suspended`, and `archived` values used by the guarded state machine.

Publication requires all of the following in the database trigger:

- moderator or administrator caller;
- managed zone;
- non-residential category unless externally approved flags are enabled;
- authority-to-offer record in `space_internal`;
- approved verification with `verified_at`;
- approved public media in `listing-public`.

## Discovery, enquiries and viewings

| Relation                            | Purpose                                     | Access                                       |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------- |
| `public_listings`                   | Invoker-rights flattened public search view | Anonymous/authenticated read                 |
| `saved_listings` / `saved_searches` | Personal discovery and alert settings       | Owner only                                   |
| `enquiries` / `enquiry_messages`    | Seeker-provider thread                      | Participants and staff                       |
| `enquiry_attachments`               | Private attachment metadata                 | Participants and staff                       |
| `viewings`                          | Requested/accepted viewing lifecycle        | Enquiry participants and staff               |
| `viewing_private_details`           | Released directions and meeting contact     | Audited RPC for confirmed participants/staff |
| `viewing_safety_checkins`           | Departing/arrived/safe/needs-help events    | Participant and authorised staff             |
| `reports`                           | Listing/safety reports                      | Reporter insert; staff read                  |

`search_public_listings(...)` performs database-side filters, ranking, sorting,
pagination, and total count without accepting raw PostgREST filter syntax.

## Occupancy and finance records

The platform is non-custodial. These relations document obligations and
external payments; they never represent a platform wallet or escrow.

| Relation                            | Purpose                                               | Mutation rule                                              |
| ----------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `occupancies` / `occupancy_parties` | Terms, dates, parties, confirmation and lifecycle     | Participant/server actions with RLS and audit              |
| `charges`                           | Scheduled amount and due date                         | Created/voided through ledger RPCs; idempotent per creator |
| `payment_records`                   | External payment reference and dual confirmation      | Append-only amount/method; state through RPCs              |
| `payment_allocations`               | FIFO allocation from confirmed payment to charges     | Internal RPC only; append-only                             |
| `payment_receipts`                  | Receipt number/code issued after both parties confirm | Internal RPC only; immutable                               |
| `payment_disputes`                  | Dispute reason and resolution state                   | Participant/staff RPCs; history retained                   |
| `payment_adjustments`               | Additive correction rather than rewriting history     | Finance/admin RPC only; immutable                          |
| `dzalekapay_reconciliations`        | Latest minimal provider status and amount match       | Payment parties read; service-only RPC write               |
| `dzalekapay_webhook_events`         | Signed delivery dedupe without raw payload/phone      | Service only; append-only                                  |
| `provider_expenses`                 | Provider-private operating notes                      | Provider/team permission scope                             |

Critical RPCs include `ledger_create_charge`, `ledger_record_payment`,
`ledger_confirm_payment`, `ledger_dispute_payment`, `ledger_reject_payment`,
`ledger_void_charge`, and `ledger_create_adjustment`. Direct payment mutation is
revoked. Idempotency keys prevent retry duplicates.

DzalekaPay reconciliation stores transaction/store UUIDs, provider status,
amount, masked/reference value and timestamps only. It does not store the payer
phone or upstream payload. `dzalekapay_receipt_verification_guard` blocks the
transition to `confirmed` unless provider status is `completed`, the amount
matches and the local transaction UUID is the reconciled UUID.

## Maintenance marketplace

| Relation                                                       | Purpose                                            | Access                                                     |
| -------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `service_provider_profiles` / `service_provider_work_examples` | Public active trade profile and moderated examples | Public active profile; own/staff write                     |
| `maintenance_tickets`                                          | Request, triage and open job                       | Requester/provider/staff; privacy-safe open-job projection |
| `maintenance_quotes`                                           | Quote terms                                        | Requester, quoting provider and staff                      |
| `maintenance_work_orders`                                      | Assignment, schedule, progress and completion      | Job parties and staff                                      |
| `maintenance_messages`                                         | Work thread                                        | Job parties and staff                                      |
| `maintenance_documents`                                        | Private evidence/quote/completion files            | Job parties and staff                                      |
| `maintenance_reviews`                                          | Post-completion review                             | Eligible requester writes; scoped read/public moderation   |

Exact work directions are not exposed with open jobs. They become available
only after authorised assignment.

## Administration, privacy and analytics

| Relation                            | Purpose                                         | Access                                               |
| ----------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `moderation_cases` / `case_events`  | Safety, authority, fraud and dispute cases      | Staff; restricted cases narrow further               |
| `content_pages`                     | Draft/published managed content                 | Published public; admin write                        |
| `system_settings` / `feature_flags` | Versioned configuration and gates               | Staff read/admin write; protected flag trigger       |
| `audit_events`                      | Append-only actor/action/before/after record    | Admin/MFA read; controlled inserts; no update/delete |
| `analytics_events`                  | Validated privacy-safe product events           | Public/auth insert; admin read                       |
| `privacy_requests`                  | Access/correction/deletion/restriction requests | Requester and authorised staff                       |

Protected flags cannot be enabled by any application role. They include
residential publication, payment/custody/mobile-money processing, and SMS,
WhatsApp, or web-push delivery.

## Email delivery

| Relation                  | Purpose                                     | Access                                                   |
| ------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| `notification_templates`  | Subject/body catalogue                      | Staff-managed                                            |
| `notification_queue`      | Idempotent outbox, retry and lock state     | Recipient read; service worker mutation; admin oversight |
| `notification_deliveries` | Each Resend attempt and provider message ID | Recipient/admin scoped read                              |
| `email_delivery_events`   | Signed, deduplicated provider events        | Moderator/admin with MFA                                 |

`claim_notification_batch()` uses `FOR UPDATE SKIP LOCKED` and is executable by
`service_role` only. `record_resend_delivery_event()` accepts verified webhook
events from the server-only route, deduplicates the Svix ID, updates delivery
state, and fails the queue row for permanent delivery failures.

## Storage

| Bucket                 | Public | Purpose                            |
| ---------------------- | ------ | ---------------------------------- |
| `listing-public`       | Yes    | Approved marketplace images only   |
| `verification-private` | No     | Field evidence and voice notes     |
| `message-private`      | No     | Enquiry attachments                |
| `maintenance-private`  | No     | Maintenance evidence and documents |

Public images are re-encoded to remove metadata. Verification images are
re-encoded server-side; audio and other private files remain quarantined until
scanner approval. Private downloads use short-lived signed URLs after RLS
access checks.

## Database enforcement summary

- RLS enabled on every private relation; every update policy includes
  `WITH CHECK`.
- SECURITY DEFINER functions set `search_path = public`, return limited data,
  and have explicit execute grants.
- Staff-sensitive policies require `staff_mfa_satisfied()`.
- Listing transitions, publication, residential gates and protected flags are
  triggers, not UI conventions.
- Payment, allocation, receipt, adjustment and audit history is append-only.
- One active verification assignment and one published listing per space are
  enforced by partial unique indexes.
- Anonymous reads use `public_listings`; exact location and authority evidence
  do not appear in its columns.
