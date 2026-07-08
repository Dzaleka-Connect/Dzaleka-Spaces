# Permissions and access model

Enforced by Supabase RLS (see migrations) plus role checks in server code
(`src/lib/auth.ts`). The app-level checks are UX; RLS is the boundary.

## Roles (`app_role`)

| Role | Granted how | Powers |
| --- | --- | --- |
| `seeker` | Automatically on signup | Enquire, save listings, view own records |
| `provider` | Implicit: anyone may submit a space (their rows are RLS-owned) | Manage own spaces/listings, read own enquiries |
| `field_verifier` | Admin grant | Read pending listings + internal records, submit verification checklists |
| `moderator` | Admin grant | Review queue, reports, listing moderation |
| `admin` | Admin grant (bootstrap: `node scripts/grant-admin.mjs <email>`) | Everything staff + roles + flags + audit |
| `finance` | Admin grant | Phase 2 payment-ledger administration |
| `service_provider`, `organisation_manager` | Phase 3+ | Maintenance marketplace, org accounts |

`is_staff()` = moderator, admin or field_verifier.

## Access matrix (implemented subset)

| Data | Public | Seeker | Provider | Verifier | Admin |
| --- | ---: | ---: | ---: | ---: | ---: |
| Published listings | Read | Read | Read | Read | Read |
| Draft/pending listings | – | – | Own | All (staff) | All |
| Exact location / authority evidence (`space_internal`) | – | – | Write own on submit, no read-back | Read | Read |
| Enquiries | Insert | Own | Related listing | – (staff read exists) | All |
| Enquiry attachments | – | Own thread | Related listing thread | – | All |
| Verifications | Badge only | Badge only | Own summary | Read + insert checklist | All + decide |
| Saved listings | – | Own | Own | Own | Own |
| Provider team | – | – | Own team + scoped member access | – | All |
| Maintenance tickets | – | Requester | Related space/request | – | All |
| Service-provider profiles | Active read | Active read | Active read | Active read | All |
| Notification queue | – | Own delivery rows | Own delivery rows | – | All |
| Moderation cases | – | – | – | Assigned/relevant staff | All |
| Reports | Insert | Insert | Insert | Read | Read + act |
| Feature flags | Read | Read | Read | Read | Update |
| User roles | – | Own | Own | Own | Manage |
| Audit events | – | – | – | Insert | Read + insert |

## Route gating (app level)

| Route prefix | Requirement |
| --- | --- |
| `/account` | Signed in |
| `/provider` | Signed in (rows self-scope via RLS) |
| `/trades/profile`, `/trades/quotes`, `/trades/work-orders` | Signed in |
| `/verifier` | `field_verifier`, `moderator` or `admin` |
| `/admin` | `moderator` or `admin` (flags/roles: `admin` only) |

Feature flag updates are admin-only, and RLS rejects attempts to enable the
pilot-locked flags: `deposit_processing`, `mobile_money_processing`,
`residential_listings`, and `family_accommodation`.

## Separation of duties

- Verifiers submit checklists; **admins/moderators publish**. The verifier
  UI has no publish control. RLS permits field-verifier inserts but restricts
  listing publication and verification updates to moderators/admins; the
  `verifier_separation_guard` trigger also blocks self-verification.
- Confirmed financial records (Phase 2) are never edited; corrections are
  adjustment rows.
