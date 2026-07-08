# Verifier Offline Runbook

## Scope

The verifier PWA caches verifier pages and stores offline sync events locally
until the device can call `/api/verifier/sync`.

## Device Rules

- Use staff-managed devices where possible.
- Do not save refugee identity document numbers in offline notes.
- Keep notes minimal and directly tied to assignment verification.
- Sync before handing the device to another person.
- Clear browser storage after confirmed upload on shared devices.

## Sync Flow

1. The service worker caches `/verifier`, `/verifier/assignments` and
   `/verifier/offline`.
2. Offline events are queued in browser local storage.
3. `Sync now` posts events to `/api/verifier/sync`.
4. The API writes `verifier_sync_events` with a `client_generated_id` so
   retries are idempotent.

## Triage

- Confirm the user has `field_verifier`, `moderator` or `admin`.
- Check `verifier_sync_events` for `queued`, `applied` or `failed` rows.
- If a device is lost, revoke the staff account session and record an audit
  event.
