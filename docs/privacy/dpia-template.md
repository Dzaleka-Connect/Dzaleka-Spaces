# Data Protection Impact Assessment

Baseline assessment for the non-residential, non-custodial, email-only pilot.
Assessment date: 13 July 2026. Named organisational approvals must be completed
before pilot sign-off.

## Processing and purpose

Dzaleka Spaces processes the minimum information needed to publish field-
checked commercial/community space information, connect interested people with
space providers, arrange viewings, document occupancy/payment records, manage
maintenance and operate safety/administrative workflows.

The platform does not need or intentionally collect refugee identity document
copies, legal-title claims, public household coordinates, credit profiles,
biometrics or platform-held funds.

## Data inventory

| Category           | Examples                                                                                                         | Purpose                                                            | Public?                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Account            | Email, name, optional phone/messaging contact, language, roles, status                                           | Authentication, contact and access control                         | Provider display name only when associated with published content |
| Public space       | Category, zone, landmark, description, facilities, amount, availability, approved media                          | Discovery/comparison                                               | Yes after moderation/publication                                  |
| Restricted space   | Exact point/directions, authority basis/notes, field evidence                                                    | Verification and safe operational access                           | No                                                                |
| Interaction        | Saves/searches, enquiry messages/attachments, viewing state/check-ins                                            | User workflow and safety                                           | No                                                                |
| Occupancy/finance  | Parties, terms, charges, external references, confirmations, receipts/disputes, minimal DzalekaPay status/amount | Document direct arrangements and reconcile an external transaction | No                                                                |
| Maintenance        | Problem description, quote, messages, work evidence/review                                                       | Repair workflow                                                    | Active public provider profile/review only where approved         |
| Administration     | Reports, cases, role/flag/settings changes, audit events                                                         | Safety, fraud, governance and accountability                       | No                                                                |
| Delivery/technical | Recipient email, queue/delivery IDs, provider events, IP/request logs at hosting providers                       | Transactional notification and security operations                 | No                                                                |

## Data flows and processors

1. Browser submits to Next.js/Supabase using TLS.
2. Supabase stores account, database and storage records; RLS restricts each
   request.
3. Public marketplace reads only `public_listings` and approved public media.
4. Verifier drafts are encrypted locally, then synced to private/quarantined
   storage and assigned verification records.
5. Next.js sends template-rendered transactional email to Resend. Signed
   delivery events return to the canonical webhook.
6. When enabled, Next.js sends a DzalekaPay transaction UUID through a scoped
   server key and receives signed transaction events. Only merchant/status/
   amount/reference/timestamps are retained; phone/provider payload is discarded.
7. Render and Cloudflare process operational HTTP/log data according to their
   configured service roles.

See `docs/privacy/data-flow-map.md` for the diagram and
`docs/architecture/integrations.md` for integration controls.

## Necessity and proportionality

- Zone/landmark supports discovery without exact public coordinates.
- Authority basis and evidence are necessary for the stated-authority review,
  but are withheld from providers/public after submission except through a
  controlled operational process.
- Payment records are necessary for shared confirmation/receipt history; the
  platform does not initiate or hold the money. DzalekaPay reads reduce false
  receipt risk without replacing confirmation by either party.
- Verifier photo/coordinate/voice evidence is restricted to assigned work and
  supervisor review, then retained under policy rather than reused publicly.
- First-party analytics avoids sending private behavioural/location data to a
  third-party analytics SDK.
- Email content links back to the authenticated app rather than including
  sensitive case, location or payment detail.

Less intrusive alternatives used: approximate location, optional contact
fields, in-app delivery, no identity-copy storage, no payment processing, no
public evidence, generic email subjects, role-scoped views and additive finance
corrections.

## Access and safeguards

- RLS on every private table and explicit grants for Data API exposure.
- Staff/verifier MFA at route and restrictive-policy levels.
- Provider team scopes rather than account sharing.
- Assigned-only verifier records and separation of verification/publication.
- Short-lived signed private downloads; public bucket limited to approved
  listing media.
- Image metadata stripping/re-encoding and fail-closed upload quarantine.
- Encrypted offline verifier queue, inactivity lock and secure deletion after
  sync.
- Append-only audit/finance/receipt history and checksummed migrations.
- Resend send/webhook idempotency and verified signatures.
- DzalekaPay least-scope read key, raw-body HMAC, merchant/amount match,
  delivery dedupe, no raw payload persistence and receipt transition guard.
- Protected flags prevent residential/payment/delivery expansion in-app.

## Risk assessment

| Risk                                       | Inherent    | Mitigation                                                                               | Residual                         |
| ------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| Exact household/location disclosure        | High        | Public view allowlist, separate restricted records, private directions RPC, media review | Medium                           |
| Identity/protection evidence disclosure    | High        | No identity-copy requirement, private bucket, assigned/staff RLS, quarantine, audit      | Medium                           |
| Cross-user/provider access                 | High        | RLS, participant helpers, scoped RPCs/team permissions, tests                            | Low/medium                       |
| Staff misuse                               | High        | MFA, least privilege, restricted cases, append-only audit, access review                 | Medium                           |
| Shared/lost verifier device                | High        | Encryption, TOTP inactivity lock, managed-device procedure, delete after sync            | Medium                           |
| False payment/receipt record               | High        | Dual confirmation, idempotency, immutable receipt, disputes/adjustments                  | Low/medium                       |
| Forged or mismatched DzalekaPay status     | High        | HMAC/timestamp, merchant/UUID/amount checks, dedupe, service-only RPC, DB receipt guard  | Low/medium                       |
| DzalekaPay transaction data overcollection | Medium      | Minimal DTO/event schema; payer phone/raw payload discarded; restricted RLS              | Low                              |
| Notification reveals sensitive context     | Medium      | Email/in-app only, generic text, preferences, signed app access                          | Low                              |
| Malicious attachment                       | High        | Type/size checks, re-encode, quarantine and scanner requirement                          | Medium until scanned             |
| Re-identification from zone/landmark/media | Medium/high | Data minimisation, landmark/photo review, reporting/removal                              | Medium                           |
| Retention exceeds necessity                | Medium      | Retention schedule, privacy requests, archive/anonymisation jobs, audit                  | Medium pending operator evidence |

## Data subject controls

- Profile/contact correction in account settings.
- Notification preferences and session revocation.
- Save/search/message/operational records visible to the participant according
  to workflow.
- Access, correction, deletion and restriction request intake at
  `/account/privacy`.
- Reports/support path for incorrect or unsafe public information.

Deletion is not absolute where immutable audit, safety, dispute or accounting
records must remain. The response must explain retention, restrict access and
minimise/anonymise where appropriate.

## Retention and disposal

Apply `docs/privacy/retention-policy.md`. Database and storage deletion must be
coordinated; database backup does not remove or back up storage objects.
Verifier local data is removed immediately after successful sync or through
clear-device/offboarding. Provider event IDs retain only minimal delivery
metadata.

## Incidents and rights requests

Follow `docs/security/incident-response.md` and
`docs/operations/support-guide.md`. Exact-location or evidence exposure is a
high-priority protection incident. Preserve audit evidence, revoke access,
contain public/storage exposure, assess notification duties and communicate in
plain language through the named privacy/protection owner.

## Mandatory sign-off

| Approval                         | Name       | Date       | Decision/evidence |
| -------------------------------- | ---------- | ---------- | ----------------- |
| Product/accountable owner        | _Required_ | _Required_ | _Required_        |
| Operations/safeguarding reviewer | _Required_ | _Required_ | _Required_        |
| Privacy/data-protection reviewer | _Required_ | _Required_ | _Required_        |
| Security reviewer                | _Required_ | _Required_ | _Required_        |
| Community representative review  | _Required_ | _Required_ | _Required_        |

Do not mark this DPIA approved until names, dates, processor/retention evidence,
restore-test evidence and accepted residual risks are recorded.

## Change-assessment appendix

Create a new dated section before enabling residential listings, more precise
maps, new evidence/file types, identity data, payment processing/custody,
SMS/WhatsApp/push, or a new processor. Document purpose, necessity, alternatives,
data flow, RLS/storage changes, risks, mitigations, tests, rollback and signed
approval. A feature-flag change alone is not approval.
