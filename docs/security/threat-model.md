# Threat Model

## Assets

- Exact locations, private coordinates and authority evidence.
- Refugee identity and household-sensitive information.
- Enquiry threads and private attachments.
- Verification evidence and offline verifier drafts.
- Provider team permissions and staff roles.
- Payment and occupancy records as they are added.

## Main Risks

- Public exposure of exact household locations through listings, maps,
  analytics, logs or attachments.
- BOLA/IDOR against provider, seeker, verifier, case or attachment records.
- Email notification abuse if browser users can enqueue arbitrary messages.
- Service-role or Supabase secret leakage through `NEXT_PUBLIC_` variables.
- Offline verifier devices retaining sensitive data after sync.
- Staff role escalation through user-editable metadata.
- Unreviewed publication of residential listings or ownership/title claims.

## Current Controls

- Public marketplace reads from `public_listings`, not private base tables.
- Exact location and authority evidence remain in staff-only tables.
- Private attachments use `message-private` storage plus participant RLS.
- Notification queue writes are server-side/admin only; users cannot call the
  queue function directly.
- Staff roles come from `user_roles`, not user-editable metadata.
- Residential and family accommodation publication remains feature-flag gated.
- Verifiers submit evidence/checklists; moderators/admins publish.

## Open Hardening Work

- Add automated RLS tests for cross-user access attempts.
- Add CSP/security headers and dependency scanning gates.
- Add MFA/step-up auth enforcement for staff and notification worker secrets.
- Add malware scanning before private/public file acceptance.
- Add local encryption for verifier offline drafts where supported.
