# Permissions and Access Model

Supabase RLS, grants, triggers, and SECURITY DEFINER RPCs are the security
boundary. Server route/layout checks provide early rejection and usable
redirects; they do not replace RLS.

## Roles

| Role                   | Scope                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `seeker`               | Public discovery, own saves/searches/enquiries/viewings/occupancies/finance/maintenance/privacy requests |
| `provider`             | Own spaces/listings and related operational records                                                      |
| `service_provider`     | Own trade profile, eligible jobs, own quotes/work orders and participant threads                         |
| `organisation_manager` | Organisation membership and delegated records                                                            |
| `field_verifier`       | Assigned field visits and own completed work only                                                        |
| `moderator`            | Review, publication, cases, content and operational oversight                                            |
| `finance`              | Ledger review/adjustment duties explicitly granted by policy                                             |
| `admin`                | Role/flag/settings/audit administration plus moderator powers                                            |

Roles are stored in `user_roles`; profile metadata is not trusted for
authorisation. `admin` or `moderator` can review; role and protected-flag
management remains administrator-only.

## Authentication assurance

- Public and ordinary account pages accept AAL1.
- `/admin/*` and `/verifier/*` require AAL2 in their layouts.
- Restrictive RLS policies call `staff_mfa_satisfied()` on sensitive staff
  tables, so bypassing the UI does not bypass MFA.
- Suspended or closed accounts are routed to `/account/security` and rejected
  from operational portals.
- TOTP enrolment, challenge, removal, password update and global/other-session
  revocation are available at `/account/security`.

## Data access matrix

| Data                                                        | Anonymous                    | Account participant                       | Provider/team                              | Assigned verifier           | Moderator/admin                                               |
| ----------------------------------------------------------- | ---------------------------- | ----------------------------------------- | ------------------------------------------ | --------------------------- | ------------------------------------------------------------- |
| `public_listings`, active service profiles, zones/landmarks | Read                         | Read                                      | Read                                       | Read                        | Read                                                          |
| Draft/non-public spaces and listings                        | None                         | None                                      | Owner or delegated permission              | Assignment projection only  | Read/review                                                   |
| `space_internal` exact location and authority evidence      | None                         | None                                      | Submit for own space; no general read-back | Assigned visit only         | Authorised read with MFA                                      |
| Verification evidence/files                                 | None                         | None                                      | Status summary only                        | Own assignment insert/read  | Reviewer read with MFA                                        |
| Enquiries/messages/attachments                              | None except enquiry creation | Own thread                                | Related listing thread                     | None                        | Case-authorised access                                        |
| Viewing record                                              | None                         | Participant                               | Participant                                | None                        | Authorised oversight                                          |
| Released viewing directions                                 | None                         | Confirmed participant through audited RPC | Confirmed participant through audited RPC  | None                        | Audited access                                                |
| Occupancy/charges/payments/receipts                         | None                         | Occupancy party                           | Provider or delegated finance permission   | None                        | Scoped oversight; adjustment by authorised role               |
| Maintenance private records/files                           | None                         | Requester/party                           | Related space/party                        | None                        | Authorised oversight                                          |
| Notification queue/deliveries                               | None                         | Own recipient rows                        | Own recipient rows                         | Own recipient rows          | Operational oversight with MFA                                |
| Cases/audit/system settings/email events                    | None                         | None                                      | None                                       | Assigned/relevant case only | Staff scope; audit/settings/admin operations narrowed by role |
| Reports/privacy requests                                    | Insert own                   | Own request/status                        | Own request/status                         | Escalate                    | Triage/manage                                                 |

## Provider team permissions

`provider_team_members.permissions` is evaluated by helper functions and RLS.
Supported scopes cover view-only, spaces, listings, enquiries, viewings,
occupancies, payment records, maintenance, reports and manager access. A team
member never inherits access merely because they know a provider or space ID.

## Separation of duties

- A moderator/admin assigns a verifier.
- Only the assigned verifier can download or submit the visit before expiry.
- A verifier cannot verify their own listing and cannot publish.
- Verifier submission creates the verification and advances the listing to the
  completed field-check state atomically.
- A moderator/admin approves verification and publishes atomically; the
  publication trigger independently checks authority, zone, category, approved
  verification and public media.
- Direct finance-row updates/deletes are revoked. Participants use narrowly
  scoped RPCs; corrections are additive adjustment/dispute records.

## Service role

`SUPABASE_SECRET_KEY` is used only in server-only modules for queue work and
verified provider webhooks. Service-only RPCs:

- `claim_notification_batch(int)` atomically claims ready email rows with
  `SKIP LOCKED`.
- `record_resend_delivery_event(...)` records an already signature-verified
  provider event and updates delivery state idempotently.

Neither function is executable by anonymous or authenticated application
roles.

## Storage

- `listing-public`: anonymous read; provider upload goes through validation and
  publication approval.
- `verification-private`: assigned verifier and reviewer scope; quarantined
  objects are blocked until clean.
- `message-private`: enquiry participants only.
- `maintenance-private`: maintenance participants only.

Private download endpoints first establish database access and then issue a
short-lived signed URL. Object paths are not treated as authorisation.

## Protected flags

The trigger rejects attempts to enable:

```text
residential_listings
family_accommodation
payment_processing
mobile_money_processing
mobile_money_integrations
deposit_processing
deposit_custody
sms_notifications
whatsapp_notifications
web_push_notifications
```

Changing this list requires an externally approved migration and updated
privacy, threat-model, operational and rollback evidence.
