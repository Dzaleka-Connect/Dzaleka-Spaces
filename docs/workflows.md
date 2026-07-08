# Core workflows

## The launch journey

> A provider submits a space, a field representative verifies it, an
> administrator publishes it, and a seeker discovers it and requests a
> viewing.

```text
Provider: /list-a-space form
   → spaces row (provider-owned)
   → space_internal row (authority basis — never public)
   → listings row (status: pending_review)
        ↓
Verifier: /verifier/assignments
   → opens assignment, completes field checklist
   → verifications row (status: pending, checklist jsonb, verifier_id)
        ↓
Admin: /admin/review
   → reviews listing + checklist
   → APPROVE: verification → approved (verified_at now),
              listing → published (trigger re-checks zone/authority/flags),
              audit event
   → REQUEST CHANGES: listing → changes_requested, audit event
   → REJECT: listing → rejected, audit event
        ↓
Seeker: /spaces
   → sees published listing with Verified badge
   → optionally saves or compares listings while evaluating options
   → submits enquiry (anonymous or signed-in)
   → provider sees it in /provider, replies via chosen channel
```

## Enquiry rules

- Anonymous enquiries are allowed on published listings only (RLS).
- Provider contact details are only released per the provider's preference.
- Every listing page carries the "view before paying" safety notice.
- Signed-in participants can reply in enquiry threads. Private attachments are
  stored in `message-private` and downloaded through signed URLs after RLS
  verifies the requester is an enquiry participant.

## Maintenance marketplace

- Service providers create/update `/trades/profile`.
- Open maintenance tickets appear in `/trades/jobs`; exact locations remain
  hidden until assignment.
- Service providers submit quotes from `/trades/quotes/new`.
- Accepted quotes become `/trades/work-orders`. Providers mark work completed
  with notes; requesters leave reviews at `/trades/reviews`.
- Participants message on `/trades/messages/[ticketId]` (ticket participants
  only). Private evidence uploads go to `maintenance-private` and are listed
  at `/trades/documents`, downloaded via signed URLs after RLS checks.

## Notifications

- App code writes transactional email work to `notification_queue` with
  idempotency keys.
- `/api/jobs/process-notifications` is protected by
  `NOTIFICATION_WORKER_SECRET` and sends through Resend when configured.
- SMS, WhatsApp and push adapters remain disabled.

## Verifier offline

- The service worker caches verifier pages.
- `/verifier/offline` stores minimal local sync events and posts them to
  `/api/verifier/sync` when connectivity returns.
- Offline records must not include refugee ID numbers or unnecessary private
  household details.

## Saved listings, comparison and reports

- Signed-in seekers can save published listings for later review in
  `/account/saved-spaces`.
- `/compare?ids=...` accepts up to three published listing IDs and shows only
  public listing data: zone, landmark, category, price, facilities and
  verification badge state.
- Anyone can report a public listing, but report contents are staff-only. The
  report form must not ask for refugee ID numbers, exact household
  coordinates, or private evidence.

## Verification meaning (public copy — keep consistent)

> Dzaleka Spaces verified the listing details and the provider's stated
> authority to offer this space. This verification does not establish
> ownership of land or property.

## Publication guard (database trigger)

A listing can transition to `published` only when:
1. its space has a zone,
2. an authority record exists in `space_internal`,
3. its category is not residential-gated (feature flags),
4. no other listing for the same space is already published.

## Re-verification

`verifications.reverify_by` (90 days by default in seed) marks when a
listing should be checked again. Expiry automation is a Phase 2 cron job.
