# CI And Hardening

## Current Gates

- `npm run lint`
- `npm run typecheck`
- `npm run build`

The GitHub Actions workflow runs these gates on pull requests and pushes to
`main`.

## Required Next Gates

- RLS tests for seeker/provider/staff isolation.
- Storage policy tests for private buckets.
- E2E tests for provider submit → verifier check → admin publish → seeker
  enquire.
- E2E tests for enquiry attachments and notification queueing.
- Accessibility checks for public marketplace and role portals.
- Dependency/security scanning with a documented exception process.
