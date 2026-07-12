# Threat Model

Reviewed against the email-only, non-residential, non-custodial pilot on
13 July 2026. Re-review after any protected-flag, role, storage, integration or
retention change.

## Assets

| Asset                                               | Harm if exposed or changed                              |
| --------------------------------------------------- | ------------------------------------------------------- |
| Exact space/viewing/work directions and coordinates | Physical safety, household targeting, re-identification |
| Authority and verification evidence                 | Identity/protection harm, coercion, retaliation         |
| Enquiry, occupancy, maintenance and case records    | Relationship, financial and safeguarding disclosure     |
| Payment/receipt history                             | Fraud, dispute manipulation, false debt/receipt claims  |
| Roles, team permissions, MFA and sessions           | Cross-account access and unauthorised publication       |
| Resend/Supabase/worker/DzalekaPay secrets           | Data access, forged provider state, queue/API abuse     |
| Offline verifier drafts and media                   | Device-loss disclosure and evidence tampering           |
| Audit/migration history                             | Concealment of misuse or inconsistent production state  |

## Trust boundaries

1. Anonymous browser -> Next.js public routes -> Supabase public view/RPC.
2. Authenticated browser -> server actions/Data API -> RLS.
3. Provider/team, account, trades, verifier and admin role boundaries.
4. Staff AAL1 -> AAL2 operational boundary.
5. Browser IndexedDB/service worker -> verifier sync API.
6. Public/private/quarantined storage bucket boundaries.
7. Next.js server -> Supabase service role for queue/webhook operations.
8. Next.js server -> Resend send API; Resend -> signed public webhook.
9. Next.js server -> DzalekaPay transaction read; DzalekaPay -> signed webhook.
10. Operator workstation -> `DIRECT_URL` migration/test connection.

## Threats and controls

| Threat                                    | Primary controls                                                                                          | Verification                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Anonymous exact-location/evidence access  | `public_listings` allowlisted columns, private tables/buckets, signed URL after access check              | RLS suite checks columns, buckets and anonymous denial     |
| BOLA/IDOR by guessed UUID                 | Participant/ownership RLS, scoped RPCs, path-independent authorisation                                    | Data API/RLS tests; server queries include user/role scope |
| Verifier reads/submits unassigned listing | `verification_assignments`, assigned user/expiry/MFA checks, one active assignment                        | Submission RPC + RLS tests/catalog review                  |
| Verifier self-verifies or publishes       | Separation trigger and role state machine; no publish grant/control                                       | Workflow trigger and review RPC                            |
| Provider/team privilege escalation        | Permission helper evaluates provider/member/scope; admin role stored separately                           | RLS policies and role-management audit                     |
| Staff session theft                       | AAL2 layout and restrictive MFA RLS, session revocation, short private URLs                               | Auth assurance test/rehearsal                              |
| Illegal/unsafe category publication       | Protected feature trigger plus publication category trigger                                               | RLS suite attempts to enable/publish and expects failure   |
| Fake ownership/title claim                | Required vocabulary/content guard, authority wording, moderator review                                    | `npm run check:content` and content review                 |
| Duplicate/mutated financial record        | Stable idempotency keys, RPC-only writes, append-only triggers, additive adjustments                      | Unit/database trigger checks and dual-party rehearsal      |
| Fake receipt before payment confirmation  | Receipt issued only inside dual-confirmation RPC                                                          | Payment smoke test and immutable receipt trigger           |
| Forged/mismatched DzalekaPay confirmation | Raw-body HMAC, timestamp window, merchant/UUID/amount match, service-only RPC, receipt transition trigger | Signature unit tests and live rolled-back guard assertions |
| Replayed/out-of-order DzalekaPay event    | Delivery primary key and provider timestamp ordering; API re-read available                               | Duplicate/stale event tests and runbook rehearsal          |
| DzalekaPay key or payer phone disclosure  | Server-only scoped read key, minimal DTO/event tables, no raw payload logging/storage                     | Bundle/repository scan and database column review          |
| Concurrent duplicate email sends          | `SKIP LOCKED` claim RPC and Resend idempotency key                                                        | Queue concurrency test/review and provider records         |
| Forged/replayed email webhook             | Raw-body Svix verification, server-only secret, event primary key, service-only RPC                       | Invalid-signature and replay tests                         |
| Upload script/malware/GPS leak            | MIME/size allowlist, image re-encoding, EXIF removal, quarantine registry, restrictive read policy        | File-upload runbook/tests and scanner queue                |
| Offline device loss                       | Non-exportable AES-GCM key, encrypted IndexedDB, inactivity TOTP, delete after sync, clear-device control | Verifier offline rehearsal                                 |
| Service worker caches private HTML        | Network-only navigation with generic offline fallback; static allowlist cache                             | Service worker review/browser offline test                 |
| Open redirect/phishing                    | Callback accepts only internal relative `next` paths                                                      | Route unit/review and auth smoke test                      |
| Secret leakage                            | Production env validation, server-only modules, public-prefix rule, CI secret review                      | Deployment checklist and repository scan                   |
| SQL/migration drift                       | Parameterised queries/RPCs, transactional checksum runner, applied-migration ledger                       | `--check`, checksum and RLS tests                          |
| XSS/clickjacking/content injection        | React escaping, no arbitrary HTML rendering, nonce CSP, frame ancestors/denial, validation                | Build/browser tests and live-header check                  |
| CSRF on state change                      | SameSite Supabase cookies, server auth/RLS, POST actions, origin/form-action CSP                          | Authenticated workflow testing                             |
| Denial of service/abuse                   | Bounded pagination/uploads/batches, queue backoff, DB indexes, hosting edge controls                      | Monitoring and load/capacity review                        |

## Residual operational risks

- Browser encryption is not hardware-backed. Managed devices, screen locks,
  inventory, offboarding and physical custody are required.
- Non-image upload malware risk remains until an external scanner marks the
  object clean; quarantine must remain fail-closed.
- Staff can misuse authorised access. Audit review, least privilege, case
  assignment and safeguarding supervision are required.
- Email can reveal account/activity context on shared inboxes. Subjects stay
  generic; users can disable categories and use in-app records.
- Public zone/landmark combinations may still narrow a location in a small
  community. Review public copy/media and remove identifying details.
- Hosting, DNS, Supabase, Resend and DzalekaPay are external availability/security
  dependencies. Monitor status and maintain incident contacts.

## Security acceptance gates

- No critical/high unresolved finding affecting pilot scope.
- RLS, unit, browser/axe, lint, typecheck and production build green.
- Staff/verifier TOTP enrolment and role list reviewed.
- Invalid and replayed Resend webhook tests passed.
- Altered/stale/replayed DzalekaPay webhook and amount/merchant mismatch tests passed.
- Database and storage restore drill recorded.
- Quarantine backlog monitored and inaccessible while pending.
- Incident, protection and privacy owners named with current contact paths.

## Change triggers

Repeat the threat model and DPIA before residential publication, any payment
processing/custody, SMS/WhatsApp/push, new public map precision, identity
document storage, biometric data, third-party analytics, new file type/bucket,
or a material role/retention change.
