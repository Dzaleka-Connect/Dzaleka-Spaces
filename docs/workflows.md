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
