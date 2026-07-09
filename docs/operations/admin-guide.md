# Admin Guide

For moderators and admins working in `/admin`.

## Roles

- **moderator** — review queue, listings, reports/cases, occupancy oversight.
- **admin** — all of the above plus `/admin/users` role management,
  `/admin/settings`, feature flags and the audit log.

Grant the first admin with `node scripts/grant-admin.mjs <email>` (the user
must have signed in once). After that, manage roles in `/admin/users`.

## Review queue (`/admin/review`)

A listing reaches you after a verifier submits a field checklist. For each:

- Read the checklist, notes and any flags.
- **Approve & publish** — sets verification approved, publishes the listing
  (the DB re-checks zone, authority and residential flags), audited.
- **Request changes** — returns to the provider with a reason.
- **Reject** — removes it from the queue.

You cannot publish a listing that lacks an authority record or whose category
is residential while the flag is off — the database enforces this.

## Cases (`/admin/cases`)

Reports become cases. Assign, add internal notes, set status and outcome.
Protection-sensitive cases carry stricter access — do not export them, and
route genuine protection concerns to the approved support pathway.

## Feature flags (`/admin/flags`, `/admin/settings`)

Flags gate residential listings, deposits, mobile-money, maintenance, etc.
The pilot-locked flags (residential, family, deposit, mobile-money) must stay
off until written operational guidance authorises them.

## Audit (`/admin/audit`, admin only)

Every significant action is recorded. Filter by entity to investigate. The log
is append-only — never delete rows.
