# Incident Response

## Severity

- **S1** — private data exposed (exact locations, identity/authority evidence,
  another user's records) or auth bypass.
- **S2** — integrity loss (unauthorised publication, tampered payments/audit)
  or platform outage.
- **S3** — degraded feature, elevated errors, failed notifications.

## First 30 minutes

1. Record start time, reporter and a one-line summary in the incident log.
2. Contain: if data exposure, disable the affected feature via its
   `feature_flags` row; if account compromise, revoke sessions and roles.
3. Preserve evidence — do not delete `audit_events`; export relevant rows.
4. Assign an incident lead and a scribe.

## Investigate

- Query `audit_events` filtered by entity/actor/time for the affected records.
- Check Supabase Auth logs and API logs for the actor and time window.
- Confirm scope: which users/records, over what period.

## Data-exposure specifics

- Protection-sensitive or identity data → engage the approved protection /
  legal-support pathway immediately; do not investigate in isolation.
- Assess Malawi Data Protection Act 2024 notification duties (see
  `docs/privacy/retention-policy.md` and the DPIA).

## Recover

- Rotate any leaked keys (`RESEND_API_KEY`, Supabase keys); never expose
  service-role in `NEXT_PUBLIC_` vars.
- Re-enable features only after the root cause is fixed and verified with
  `npm run test:rls`.

## After

- Write a blameless post-incident note: timeline, root cause, fix, follow-ups.
- Add a regression assertion to `scripts/test-rls.mjs` where applicable.
