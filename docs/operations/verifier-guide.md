# Verifier Guide

For field verifiers using `/verifier` (installable, offline-capable PWA). For
the offline sync mechanics see `verifier-offline-runbook.md`.

## Your role

You collect evidence; you never publish. A separate reviewer decides
publication. You must never verify a listing for a space you provide — the
database blocks self-verification.

## Before a visit

- Open `/verifier/assignments`, review the listing, zone, landmark and the
  provider's stated authority basis.
- If connectivity is poor, load the assignment while online so it is cached.

## During the visit

Complete the checklist (`/verifier/assignments/[id]`):

- Confirm the space exists and matches the photographs.
- Check facilities, price and deposit against the listing.
- Review the provider's authority-to-offer evidence.
- Capture evidence photos (stored in the private bucket) and, where relevant,
  private coordinates.
- Record any safety concern or conflicting authority claim.
- Choose a recommendation: details confirmed / changes required / unable to
  verify / conflicting authority / safety escalation / supervisor review.

## After

- Submit. If offline, the checklist queues and syncs when you reconnect
  (`/verifier/offline`). Confirm it left the queue.
- Never keep sensitive data on the device after sync — the app clears local
  drafts once uploaded.

## Reminders

- Verification confirms details and stated authority only — never ownership.
- Report safety concerns; do not attempt to resolve protection issues yourself.
