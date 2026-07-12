# Route Matrix

Updated: 13 July 2026

All master-prompt routes are handled by an explicit page or an allowlisted
portal catch-all. Unknown catch-all paths call `notFound()`; they never render a
placeholder. Portal layouts enforce authentication, role checks, staff MFA,
and `noindex` metadata.

## Public

| Routes                                                                                            | Capability                                                                      | Implementation                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| `/`, `/spaces`, `/spaces/map`, `/spaces/[id-or-slug]`, `/compare`                                 | Search, filters, sort, pagination, listing details, comparison, approximate map | Explicit pages + `src/lib/listings.ts` |
| `/zones`, `/zones/[slug]`, `/categories/[slug]`                                                   | Public indexed discovery by database reference data                             | Explicit pages                         |
| `/services`, `/services/[category]`, `/service-providers/[slug]`                                  | Public maintenance directory and profiles                                       | Explicit pages + `src/lib/trades.ts`   |
| `/list-a-space`, `/request-assisted-listing`                                                      | Provider and assisted submissions with authority declaration                    | Explicit forms/actions                 |
| `/how-it-works`, `/verification`, `/safety`                                                       | Process, verification limits, viewing safety                                    | Explicit pages                         |
| `/help`, `/help/[slug]`, `/about`, `/pricing`, `/partners`, `/contact`                            | Public support and programme content                                            | Explicit pages                         |
| `/terms`, `/privacy`, `/community-guidelines`, `/listing-rules`, `/accessibility`                 | Legal, conduct, listing and accessibility content                               | Explicit pages                         |
| `/sign-in`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/signout` | OTP/password auth and recovery with internal-only redirects                     | Explicit pages/routes                  |

## Account

| Routes                                                                              | Capability                                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/account`, `/account/profile`, `/account/security`, `/account/sessions`            | Dashboard, profile, password, TOTP, session revocation                                                       |
| `/account/saved-spaces`, `/account/saved-searches`                                  | Save, alert frequency/channel, pause, review, delete                                                         |
| `/account/enquiries`, `/account/enquiries/[id]`, `/account/messages`                | Enquiry threads, attachments, status and aggregated messages                                                 |
| `/account/viewings`, `/account/viewings/[id]`                                       | Request status, calendar export, released directions, safety check-in                                        |
| `/account/occupancies`, `/account/occupancies/[id]`, `/account/occupancy`           | Occupancy records, parties, terms, confirmations and history; singular route retained as compatibility alias |
| `/account/charges`, `/account/payments`, `/account/payments/[id]`                   | Charges, external payment records, dual confirmation, disputes and immutable receipts                        |
| `/account/maintenance`, `/account/maintenance/new`, `/account/maintenance/[id]`     | Request, message, quote, evidence and work-order maintenance flow                                            |
| `/account/documents`, `/account/notifications`, `/account/privacy`, `/account/help` | Consolidated documents, queue history, data-rights requests and support                                      |

## Space provider

Explicit high-frequency pages handle dashboard, lists, edit/preview and detail
workflows. `src/app/provider/[...segments]/page.tsx` handles the remaining
allowlisted master routes with real RLS-backed records and forms.

| Route family               | Included routes                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile and settings       | `/provider/profile`, `/provider/settings`                                                                                                                                                                                                       |
| Spaces and listings        | `/provider/spaces`, `/provider/spaces/new`, `/provider/spaces/[id]`, `/provider/spaces/[id]/edit`, `/provider/listings`, `/provider/listings/new`, `/provider/listings/[id]`, `/provider/listings/[id]/edit`, `/provider/listings/[id]/preview` |
| Verification               | `/provider/verifications`, `/provider/verifications/[id]`                                                                                                                                                                                       |
| Enquiries/viewings         | `/provider/enquiries`, `/provider/enquiries/[id]`, `/provider/viewings`, `/provider/viewings/calendar`, `/provider/viewings/[id]`                                                                                                               |
| Occupancy and ledger       | `/provider/occupancies`, `/provider/occupancies/new`, `/provider/occupancies/[id]`, `/provider/charges`, `/provider/charges/new`, `/provider/payments`, `/provider/payments/new`, `/provider/payments/[id]`, `/provider/deposits`               |
| Maintenance and operations | `/provider/maintenance`, `/provider/maintenance/[id]`, `/provider/work-orders`, `/provider/work-orders/[id]`, `/provider/expenses`, `/provider/documents`, `/provider/messages`, `/provider/reports`, `/provider/team`                          |

## Field verifier

`src/app/verifier/[...segments]/page.tsx` consolidates checklist/evidence/
completion subroutes into the assignment workspace while preserving every
documented URL.

```text
/verifier
/verifier/assignments
/verifier/assignments/[id]
/verifier/assignments/[id]/checklist
/verifier/assignments/[id]/evidence
/verifier/assignments/[id]/complete
/verifier/map
/verifier/offline
/verifier/completed
/verifier/notifications
/verifier/profile
/verifier/security
```

Only assigned verifiers can read or submit a visit. Submission is an atomic RPC
that records the verification and advances the listing to supervisor review.

## Maintenance trades

```text
/trades
/trades/profile
/trades/jobs
/trades/jobs/[id]
/trades/quotes
/trades/quotes/new
/trades/quotes/[id]
/trades/work-orders
/trades/work-orders/[id]
/trades/schedule
/trades/messages
/trades/messages/[ticketId]
/trades/reviews
/trades/documents
/trades/settings
```

The public directory is `/services`; `/trades/*` is the role-gated service
provider workspace and is not indexed.

## Administration

Explicit queue and dashboard pages are supplemented by the allowlisted
`src/app/admin/[...segments]/page.tsx` resource/detail renderer and operation
forms. Sensitive evidence is not exposed by the generic renderer.

| Route family                  | Included routes                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review and listing operations | `/admin`, `/admin/review`, `/admin/spaces`, `/admin/spaces/[id]`, `/admin/listings`, `/admin/listings/[id]`                                                                                                                                                                                                |
| Verification and identities   | `/admin/verifications`, `/admin/verifications/calendar`, `/admin/verifications/[id]`, `/admin/verifiers`, `/admin/verifiers/[id]`, `/admin/users`, `/admin/users/[id]`, `/admin/providers`, `/admin/providers/[id]`, `/admin/organisations`, `/admin/organisations/[id]`                                   |
| Occupancy and finance records | `/admin/occupancies`, `/admin/occupancies/[id]`, `/admin/charges`, `/admin/payments`, `/admin/payments/[id]`, `/admin/deposits`, `/admin/adjustments`, `/admin/receipts`                                                                                                                                   |
| Maintenance and services      | `/admin/maintenance`, `/admin/maintenance/[id]`, `/admin/work-orders`, `/admin/service-providers`, `/admin/service-providers/[id]`                                                                                                                                                                         |
| Safety and reference data     | `/admin/cases`, `/admin/cases/[id]`, `/admin/locations/zones`, `/admin/locations/zones/[id]`, `/admin/locations/landmarks`, `/admin/locations/landmarks/[id]`                                                                                                                                              |
| Content and delivery          | `/admin/content/pages`, `/admin/content/help`, `/admin/content/announcements`, `/admin/content/translations`, `/admin/notifications`, `/admin/notifications/templates`, `/admin/notifications/failures`                                                                                                    |
| Governance and health         | `/admin/analytics`, `/admin/reports`, `/admin/settings/general`, `/admin/settings/listings`, `/admin/settings/verification`, `/admin/settings/payments`, `/admin/settings/privacy`, `/admin/settings/retention`, `/admin/settings/feature-flags`, `/admin/settings/roles`, `/admin/audit`, `/admin/system` |

## Machine endpoints

| Route                             | Protection                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `/api/jobs/process-notifications` | 32+ character bearer secret; atomic DB claims                                                 |
| `/api/webhooks/resend`            | Raw-body Svix signature verification and idempotent event RPC                                 |
| `/api/webhooks/dzalekapay`        | Raw-body HMAC, timestamp window, merchant match and idempotent event RPC                      |
| `/api/verifier/sync`              | Authenticated assigned verifier, MFA, expiry/idempotency checks, media re-encoding/quarantine |
| `/api/enquiry-attachments/[id]`   | Enquiry participant RLS and signed private download                                           |
| `/api/maintenance-documents/[id]` | Ticket participant RLS and signed private download                                            |
| `/api/viewings/[id]/calendar`     | Viewing participant access                                                                    |
