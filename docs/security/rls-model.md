# RLS Model

Row-level security is the real access boundary. App-level role checks in
`src/lib/auth.ts` are UX only; the database enforces access even if a page
check is missed.

## Principles

- RLS is enabled on every table in the exposed `public` schema.
- Tables are not auto-exposed to the Data API (Supabase, Apr 2026); each needs
  an explicit `GRANT` plus policies. New migrations must add both.
- Public reads go through the `public_listings` view (`security_invoker`),
  never base tables.
- Anonymous (`anon`) role: read published listings + zones/landmarks/flags;
  insert enquiries, reports and assisted-listing requests; nothing else.

## SECURITY DEFINER helpers

These bypass RLS deliberately to break policy-reference cycles or to expose a
single derived fact. Each reveals only a boolean/timestamp about the caller or
a published row — never private data:

- `has_role(role)`, `is_staff()`, `canModerate` (moderator/admin).
- `owns_space(space_id)`, `space_has_published_listing(space_id)` — break the
  `spaces` ↔ `listings` recursion.
- `listing_verified_at(listing_id)` — powers the public verified badge without
  exposing `verifications`.
- `feature_enabled(flag)` — used in the publication guard.
- `is_occupancy_party(id)`, `is_occupancy_provider(id)` — occupancy cycle.
- Team/maintenance equivalents added in migrations 00007–00008.

All are defined in a controlled search_path and only compare against
`(select auth.uid())`.

## Policy patterns

- `TO authenticated` is never used alone; it is always paired with an ownership
  predicate in `USING` (avoids BOLA/IDOR).
- Every `UPDATE` policy has both `USING` and `WITH CHECK` so a row's owner
  cannot be reassigned.
- Reporter identity is protected: `reports` allow insert-by-anyone but
  read-by-staff-only.
- Verification evidence, exact locations and authority evidence live in
  staff-only tables (`space_internal`, `verifications`) or private buckets.

## Testing

`npm run test:rls` (scripts/test-rls.mjs) runs the anon-exposure and
workflow-guard assertions against the live database inside rolled-back
transactions. It runs in CI when `DIRECT_URL` is configured as a secret, and
skips cleanly otherwise. Extend it whenever a table or guard is added.
