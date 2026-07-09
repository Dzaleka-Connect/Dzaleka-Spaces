# Rollback

## Application

Redeploy the previous known-good build from the host's deployment history.
App code is stateless, so this is immediate and safe.

## Database

Schema changes are not auto-reverted by an app rollback. Before every
production migration, note whether it is backward-compatible with the previous
app version:

- **Additive** (new table/column/policy) — usually compatible; the old app
  ignores it. Prefer additive migrations so app rollback is clean.
- **Destructive** (drop/rename/retype) — write a paired down-migration first
  and test it on staging. Only apply if you accept that app rollback also needs
  the down-migration.

To revert a specific migration, apply its reviewed down-migration with
`scripts/db-apply.mjs` (transactional — it aborts cleanly on error).

## Data

- Row-level mistakes: restore affected rows from the latest backup into a temp
  table and reconcile; do not truncate live tables.
- Storage objects are backed up separately from the database — restore from the
  storage backup, not a DB restore.

## After any rollback

- Run `npm run test:rls`.
- Record what happened and why in the incident log.
