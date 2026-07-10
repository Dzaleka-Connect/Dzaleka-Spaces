# CI and Hardening

`.github/workflows/ci.yml` runs on pull requests and `main` pushes with
concurrency cancellation and read-only repository permissions.

## Web job

- Deterministic `npm ci` on Node 24.
- `npm run format:check`.
- ESLint: Next core web vitals, TypeScript, React hooks and security rules.
- Strict TypeScript.
- Product/content/UI guards: required vocabulary, no raw selects outside the
  primitive, no disallowed letter spacing/oversized card rounding, no fake
  payment success text.
- Vitest unit suite.
- Next production build and route generation.
- RLS/workflow/Data API suite when database secrets exist; mutation checks are
  rolled back.

## Browser job

- Pinned Playwright Chromium installation.
- Desktop Chrome and Pixel 7 projects.
- Public homepage/search/services/auth smoke coverage.
- Horizontal-overflow assertion.
- axe WCAG 2 A/AA and 2.1 A/AA scan; serious/critical violations fail.
- Trace/screenshot diagnostics uploaded only on failure for seven days.

## Supply-chain job

- `npm audit --audit-level=high`; high/critical advisories stop the release.
- Moderate advisories require review and a dated remediation decision but do
  not automatically block when no patched compatible path exists.
- Lockfile changes require code review. Install scripts and new transitive
  packages must be justified.

## Database release controls

- Validate migrations with `scripts/db-apply.mjs ... --check`.
- Advisory lock prevents simultaneous migration runners.
- Applied version/name/SHA-256 checksum is recorded.
- Never modify an applied file; add a new migration.
- `scripts/test-rls.mjs` checks protected flags, publication guards, RLS,
  append-only triggers, public-view columns, bucket visibility, anonymous
  denial and service-only notification claims.

## Required branch protection

Protect `main`, require the three CI jobs, require reviewed pull requests,
block force pushes/deletion and restrict production deployment/migration
secrets to the production environment. GitHub, Render, Supabase, Cloudflare and
Resend administrator access should require MFA and periodic review.

## Release exception

An exception requires a named owner, affected control, risk, compensating
control, expiry date and approval. Never waive exact-location privacy,
residential/payment/delivery protected flags, staff MFA, signature verification
or finance/audit immutability.
