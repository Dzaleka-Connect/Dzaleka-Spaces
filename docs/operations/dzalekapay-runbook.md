# DzalekaPay Reconciliation Runbook

## Scope and invariant

Dzaleka Spaces reads transactions that were created outside this platform and
receives signed transaction events. It never calls `POST /api/v1/payments`,
never holds money, and never enables the protected processing/custody flags.

A DzalekaPay `completed` result is provider evidence, not party confirmation.
The database requires a completed, amount-matched reconciliation before the
existing dual-confirmation flow can issue a receipt.

Contract sources: the
[`integrating-dzalekapay` skill](https://github.com/Dzaleka-Connect/dzalekapay-skills),
`https://pay.dzaleka.com/developer`, the live API catalogue and the public
OpenAPI document. Re-check them before changing endpoints, statuses or fields;
do not infer undocumented request properties.

## Merchant setup

1. In DzalekaPay Dashboard -> Developer Platform, select the intended store.
2. Create an expiring, rate-limited API key with `transactions:read` only.
   Do not grant `payments:write` or expose the key to browser/mobile code.
3. Register this HTTPS endpoint for `transaction.created` and
   `transaction.updated`:

   ```text
   https://spaces.dzaleka.com/api/webhooks/dzalekapay
   ```

4. Store the one-time `whsec_` secret separately from the API key.
5. Configure server-only variables and enable only after staging verification:

   ```text
   DZALEKAPAY_RECONCILIATION_ENABLED=true
   DZALEKAPAY_API_KEY=dzp_live_...
   DZALEKAPAY_WEBHOOK_SECRET=whsec_...
   DZALEKAPAY_MERCHANT_ID=<store UUID>
   DZALEKAPAY_BASE_URL=https://pay.dzaleka.com
   ```

`validateRuntimeEnvironment()` rejects incomplete enabled configuration,
non-HTTPS base URLs, invalid UUIDs and incorrectly prefixed secrets.

## Normal operation

1. A party records the external payment with method DzalekaPay and the
   transaction UUID, not the `DZALEKA-...` receipt/reference value.
2. The server reads `GET /api/v1/transactions/{transactionId}` with a ten-second
   timeout and persists only transaction/store UUID, status, amount, reference
   and timestamps.
3. Signed webhooks update the same row only when the provider timestamp is not
   older. Delivery UUIDs are append-only and deduplicated.
4. `pending`, unknown or timeout remains non-success. `failed`, `expired`,
   `refunded`, amount mismatch or merchant mismatch must not be confirmed.
5. After `completed` and amount match, both parties still confirm. Only then
   does the existing ledger allocate charges and issue its immutable receipt.

## Verification test

Use an approved low-value transaction and non-production recipient accounts.

1. Record a pending transaction UUID and confirm the UI says pending.
2. Attempt final local confirmation and confirm the database rejects it.
3. Replay the same signed delivery and confirm one event row exists.
4. Change one raw-body byte and confirm HTTP 400; send a timestamp older than
   five minutes and confirm HTTP 400.
5. Send the event for a different merchant and confirm HTTP 400.
6. Record a different MWK amount and confirm `amount_mismatch` blocks receipt.
7. Complete the correct transaction, confirm reconciliation becomes verified,
   then confirm both parties are still required for a receipt.
8. Inspect logs/tables and confirm no API key, secret, full phone or raw payload.
9. Run `npm run test:rls`; all mutation checks roll back.

## Failures

| Signal                    | Response                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `401`                     | Rotate/redeploy the read key, then revoke the old key. Do not print it.              |
| `403`                     | Check store state and `transactions:read`; never add `payments:write` as a shortcut. |
| `404`                     | Verify the transaction UUID belongs to the configured store. Keep unverified.        |
| `429`                     | Respect `Retry-After`; do not loop or create a new payment.                          |
| Timeout/5xx               | Keep pending/unverified and reconcile later; timeout is not failure.                 |
| Invalid webhook signature | Return 400, alert on repeated failures, rotate secret if compromise is suspected.    |
| Webhook database 5xx      | Return 500 so DzalekaPay retries; inspect migration/RPC health.                      |
| Unmatched event           | Retain the minimal event and reconcile by API after the local record exists.         |
| Refunded after receipt    | Do not rewrite history; open a dispute/additive adjustment and preserve evidence.    |

## Rotation

Create and deploy a replacement read key before revoking the prior key. For a
webhook-secret rotation, coordinate the DzalekaPay endpoint change and deploy
the new secret in one change window; verify a signed event immediately. Record
the operator, time and result without recording secret values.

## Disable and rollback

Set `DZALEKAPAY_RECONCILIATION_ENABLED=false` to fail closed. Existing payment,
reconciliation and event history remains readable to authorised parties; no
receipt or ledger history is deleted. Keep all protected payment/custody flags
off. Roll back application code through the normal release process; do not edit
or reverse applied migration `00015` by hand.
