# Backup and Restore Runbook

Database backups do not include Supabase Storage objects. Database and every
bucket must have independently monitored backups and a combined restore drill.

## Scope

- Postgres schema/data, auth linkage, migration ledger and scheduled jobs.
- `listing-public`, `verification-private`, `message-private`, and
  `maintenance-private` objects with path, size, content type and checksum.
- Render/Cloudflare/Supabase/Resend configuration inventory. Secret values stay
  in the approved secret manager, not the backup document.
- Current release commit, lockfile and migration checksums.

## Required policy record

Record and approve:

- backup frequency and retention;
- target RPO and RTO;
- encryption and storage region;
- people allowed to create/read/restore/delete backups;
- immutable/off-site copy strategy;
- failed-backup alert and escalation;
- last successful restore drill and measured result.

## Backup verification

1. Confirm Supabase backup completion and timestamp.
2. Export each bucket inventory and objects. Compare object count/bytes and
   compute checksums where the backup service permits.
3. Confirm all migration versions/checksums through `app_schema_migrations`.
4. Store release/config manifests next to the backup without embedding secrets.
5. Alert on missing, late, unexpectedly small or unreadable copies.

## Restore drill

Never test by overwriting production.

1. Create an isolated staging Supabase project and staging application origin.
2. Restore Postgres/auth data according to the provider procedure.
3. Apply only migrations absent from the restored migration ledger; checksum
   mismatch is a stop condition.
4. Recreate buckets/policies from migrations and restore objects to identical
   paths.
5. Use separate staging keys, Resend sender/test recipients and disabled
   production schedulers.
6. Run format/lint/typecheck/content/unit/build/browser/RLS gates.
7. Test public listing images; anonymous denial for exact/private data; enquiry
   and maintenance signed downloads; verifier evidence/quarantine; occupancy,
   payment and receipt history; audit continuity; email queue/event replay.
8. Compare expected table/object counts and representative checksums.
9. Record start/end time, data-loss window, failures, remediation owner and
   whether measured RPO/RTO met policy.
10. Destroy the isolated restore according to retention policy after approval.

## Production recovery

1. Declare incident and name incident/restore/communications owners.
2. Stop writes or place the service in maintenance mode if continued writes
   increase inconsistency.
3. Select the newest verified clean restore point before corruption/incident.
4. Preserve audit/log evidence and current database/object inventory.
5. Restore database and storage as a coordinated set; do not mix snapshots
   without a documented reconciliation.
6. Rotate potentially exposed keys and invalidate sessions where required.
7. Run the release smoke and RLS suites before restoring traffic to
   `https://spaces.dzaleka.com`.
8. Monitor closely, reconcile queue/webhook idempotency and communicate impact.

## Destructive operation rule

No backup deletion, production restore, table truncation or bucket purge
without current backup evidence, named approval, exact command/procedure,
rollback/stop point and incident/change record.
