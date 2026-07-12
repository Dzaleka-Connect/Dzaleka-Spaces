# Core Workflows

## Listing, verification and publication

```text
provider draft/submission
  -> pending review / authority review
  -> moderator creates assigned field visit
  -> verification scheduled
  -> assigned verifier submits checklist and evidence
  -> verification completed
  -> supervisor review
  -> verification approved
  -> listing approved
  -> listing published
```

1. `/list-a-space` creates/updates `spaces`, writes the authority statement to
   `space_internal`, registers media and creates the listing submission.
2. A moderator uses `/admin/verifications` to call
   `assign_verification_visit()`. The RPC validates the verifier role/account,
   locks the listing, creates one active assignment and advances state.
3. The assigned verifier uses `/verifier/assignments/[id]` or the encrypted
   offline queue. `submit_verification_assignment()` validates assignment,
   expiry, MFA, recommendation and idempotency; it creates the verification and
   advances the listing atomically.
4. A moderator reviews public media, authority statement, field result, risk
   flags and history. `approve_and_publish_listing()` approves verification and
   advances supervisor/approved/published states in one transaction.
5. `enforce_listing_publication()` independently blocks publication without a
   zone, authority record, approved current verification, approved public
   media, allowed category and authorised reviewer.
6. Changes/rejection/suspension write state history and append audit events.

Verification means listing details and stated authority were reviewed. It does
not establish ownership or legal title.

## Public discovery and enquiry

1. `/spaces` calls `search_public_listings()` with validated URL-backed
   filters, sort, page and page size.
2. Results contain only the invoker-rights `public_listings` columns. Public
   location is zone plus landmark.
3. A user can save/compare, report, send an enquiry, or request a viewing.
4. Enquiry messages and attachments are participant-only. Attachments use the
   `message-private` bucket and signed download endpoint.
5. Reports are readable only by authorised staff so reporter information is
   not exposed to the listing provider.

## Viewing and safety

```text
requested -> proposed/accepted -> confirmed -> completed/cancelled/no-show
```

- Participants propose/accept time and can export an authenticated calendar
  file.
- Exact directions are stored separately. The provider releases them only for
  a confirmed viewing; access uses an audited RPC.
- Safety check-ins record departing, arrived, safe or needs-help without
  publishing exact location.
- Viewing outcomes can lead to an occupancy record but never create one
  automatically without participant confirmation.

## Occupancy records

1. A provider creates terms for an eligible space and adds provider/occupant
   parties.
2. Each party confirms in-app, in-person or staff-assisted. Method and time are
   retained.
3. One live occupancy per space is enforced.
4. Active records expose charges, payment records, maintenance, messages,
   documents, notices and history to the parties.
5. Notice/completion/cancellation are documented lifecycle events. There is no
   eviction automation.

## Charges, external payment records and receipts

1. Provider creates an idempotent charge through `ledger_create_charge()`.
2. Either party records an externally completed payment through
   `ledger_record_payment()` using a stable form idempotency key.
3. For DzalekaPay, the external reference must be the transaction UUID. A
   server-only `transactions:read` call checks merchant, status and amount; the
   signed webhook keeps that separate reconciliation state current.
4. The recording party is marked confirmed; the other party reviews and
   confirms or disputes. A DzalekaPay record cannot reach final confirmation
   unless the provider status is `completed` and the MWK amount matches.
5. On dual confirmation, the database applies FIFO allocations and creates one
   immutable receipt number and verification code.
6. Rejection, dispute, void and adjustment use dedicated RPCs. Confirmed
   amounts, allocations, receipts, and audit history are never rewritten.
7. No adapter initiates payment. DzalekaPay verification does not confirm the
   parties' agreement, allocate funds, reverse a refund or prove platform custody.

## Maintenance marketplace

```text
request -> triage/open job -> quote -> accepted work order -> scheduled
-> in progress -> completion evidence -> confirmation -> review
```

- Open jobs omit exact work directions.
- Quotes are visible only to eligible parties and staff.
- Work order messages and files use participant RLS and
  `maintenance-private`.
- Reviews require completed work. Problems can escalate to a moderation case.

## Verifier offline workflow

- The service worker caches only static application assets and a generic
  offline document; it does not cache private HTML responses.
- Downloaded assignment drafts and evidence are encrypted in IndexedDB with a
  non-exportable AES-GCM key generated for that browser profile.
- Public image metadata is stripped before local storage. The sync endpoint
  re-encodes evidence images and places non-image evidence in quarantine.
- Queue order is oldest first. Each event has a client-generated idempotency
  identifier. A local item is removed only after a successful server response.
- Fifteen minutes of inactivity locks the verifier surface and requires a
  fresh TOTP challenge. Clear-device removes queue and key material.

This is practical browser protection, not hardware-backed custody. Managed
devices, screen locks and immediate offboarding remain operational controls.

## Email notifications

1. Application events enqueue a template-expanded email row with a unique
   idempotency key.
2. A scheduler calls `/api/jobs/process-notifications` with the worker bearer
   secret.
3. `claim_notification_batch()` atomically claims ready rows with
   `FOR UPDATE SKIP LOCKED`, allowing safe concurrent workers.
4. Resend receives the same idempotency key and returns a provider message ID.
5. Resend posts delivery events to `/api/webhooks/resend`. The route verifies
   the raw-body Svix signature before calling a service-only RPC.
6. Provider event IDs are deduplicated. Delivered/delayed state is recorded;
   bounce, complaint, suppression and failure mark the delivery and queue row
   failed for operator review.
7. Only email and in-app records are enabled. SMS, WhatsApp and web push are
   trigger-locked off.

## Privacy requests and case escalation

- Users submit access, correction, deletion or restriction requests from
  `/account/privacy`.
- Staff triage with case notes and append-only events.
- Restricted cases are available only to authorised/assigned staff.
- Deletion is evaluated against safety, financial-record and legal retention
  needs; immutable records may be minimised/restricted instead of erased.

## Scheduled operations

- Notification queue drain: external scheduler, every minute or operationally
  approved interval.
- Saved-search enqueue: database cron function at the approved digest interval.
- Listing/verification stale checks and viewing reminders: database cron,
  monitored for failure.
- Retention/anonymisation and audit partition/archive: scheduled per retention
  policy with dry-run and operator approval for destructive stages.
