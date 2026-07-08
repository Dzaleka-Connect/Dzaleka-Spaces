# Backup And Restore Runbook

## Database

- Supabase project backups cover Postgres data according to the selected plan.
- Keep migrations committed so schema can be recreated in a clean project.
- Test restore into staging before relying on production restore.

## Storage

Database backups do not include uploaded files. Buckets requiring separate
backup/export:

- `listing-public`
- `verification-private`
- `message-private`
- `maintenance-private`

## Restore Drill

1. Restore database into staging.
2. Recreate storage buckets and policies from migrations.
3. Restore object backups into matching bucket paths.
4. Run `npm run lint`, `npm run typecheck` and `npm run build`.
5. Verify public listing images, private attachments and verifier evidence
   access with non-staff and staff accounts.
