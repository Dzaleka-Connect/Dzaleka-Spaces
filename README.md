# Dzaleka Spaces

**Find space. Confirm details. Manage it simply.**

A mobile-first community space marketplace for Dzaleka Refugee Camp — discover
verified shops, offices, training rooms, community venues, workshops, storage
and approved homestays, with community-led field verification.

Dzaleka Spaces does **not** sell camp land, issue ownership certificates or
hold deposits. Verification confirms that a space exists and that the provider
has stated authority to offer it — nothing more.

## Stack

- [Next.js](https://nextjs.org) (App Router, mobile-first PWA target)
- [Supabase](https://supabase.com) — Postgres, Auth (email OTP), Storage, RLS
- [shadcn/ui](https://ui.shadcn.com) — component library (base-nova style)
- Tailwind CSS v4

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase credentials the app runs in
**demo mode** with sample listings, so you can explore the full UI
immediately.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the project URL,
   publishable key (`sb_publishable_...`) from **Project Settings → API**.
   Add `DIRECT_URL` if you will apply SQL from this machine.
3. Apply the migrations in order. This machine does not assume `psql` or the
   Supabase CLI; use the helper script:

   ```bash
   node scripts/db-apply.mjs supabase/migrations/00001_init.sql
   node scripts/db-apply.mjs supabase/migrations/00002_backend_foundations.sql
   node scripts/db-apply.mjs supabase/migrations/00003_portal_policies.sql
   node scripts/db-apply.mjs supabase/migrations/00004_roadmap_next.sql
   node scripts/db-apply.mjs supabase/migrations/00005_occupancies.sql
   node scripts/db-apply.mjs supabase/migrations/00006_assisted_listings.sql
   node scripts/db-apply.mjs supabase/migrations/00007_operations_marketplace.sql
   node scripts/db-apply.mjs supabase/seed.sql
   ```

4. Restart the dev server. Sign-in (email OTP), space submission, and
   enquiries now write to your database.

### Schema overview

- `spaces` are separated from `listings` so a space keeps its occupancy and
  maintenance history when re-advertised.
- `space_internal` holds exact locations and authority evidence — staff-only
  via row-level security, never public.
- `verifications` back the “Verified space” badge; only listings with an
  approved field verification show it.
- `public_listings` is the flattened read view the marketplace queries.
- Row-level security is enabled on every table; anonymous users can only read
  published listings and file enquiries/reports. Publishing is restricted to
  moderators/admins, while field verifiers only submit checklists.

## Product surfaces

| Surface | Route | Who |
| --- | --- | --- |
| Public marketplace | `/`, `/spaces`, `/spaces/[id-or-slug]`, `/spaces/map`, `/compare`, `/trades`, info/legal/help pages | Everyone |
| Seeker portal | `/account`, `/account/profile`, `/account/saved-spaces`, `/account/saved-searches`, `/account/enquiries`, `/account/viewings`, `/account/occupancy` | Signed-in users |
| Provider portal | `/provider`, `/provider/spaces`, `/provider/listings`, `/provider/listings/[id]/edit`, `/provider/listings/[id]/preview`, `/provider/team`, enquiries/viewings/occupancies | Space providers + scoped team members |
| Trades portal | `/trades`, `/trades/profile`, `/trades/jobs`, `/trades/quotes`, `/trades/work-orders`, schedule/messages/reviews/documents/settings | Service providers |
| Field verifier | `/verifier/assignments`, `/verifier/completed`, `/verifier/offline` | `field_verifier` role |
| Administration | `/admin`, `/admin/review`, `/admin/flags`, `/admin/users`, `/admin/cases`, `/admin/reports`, `/admin/notifications`, `/admin/analytics`, `/admin/settings` | `moderator` / `admin` roles |

### Bootstrapping the first admin

After signing in once (so your profile exists):

```bash
node scripts/grant-admin.mjs you@example.com
```

Roles for other staff can then be granted from the database or a future
`/admin/users` page.

## Project structure

```
src/
  app/
    page.tsx                 Home: hero, featured, categories, how-it-works
    spaces/                  Browse + listing detail + save/report/enquiry
    compare/                 Side-by-side listing comparison from query IDs
    trades/                  Maintenance provider portal
    list-a-space/            Provider submission (goes to review queue)
    how-it-works/ verification/ safety/   Public info pages
    sign-in/  auth/          Email OTP sign-in + callback/signout
    account/                 Seeker dashboard, saved spaces, enquiries
    provider/                Provider dashboard, team, listing edit/preview
    verifier/                Field-verification assignments + offline queue
    admin/                   Overview, review, cases, reports, notifications
  components/                Site chrome, cards, forms, badges
  lib/                       Domain types, data access, auth, supabase clients
supabase/
  migrations/                Schema, RLS, guards (apply in order)
  seed.sql                   Pilot sample data
scripts/
  db-apply.mjs               Apply a SQL file via DIRECT_URL (no psql needed)
  grant-admin.mjs            Grant the admin role to a user by email
docs/
  data-model.md permissions.md workflows.md roadmap.md security/ privacy/ operations/
```

## Roadmap (from the business plan)

- **Phase 1–3 implemented slices:** marketplace pilot, registration,
  submission, verification, saved listings/searches, comparison, enquiries
  with private attachments, viewings, occupancy records, provider team
  permissions, maintenance-service portal, email notification outbox, verifier
  offline queue, admin cases/content/analytics/settings.
- **Remaining Phase 2:** payment ledger (records only — no fund custody),
  receipts and adjustment/dispute workflows.
- **Remaining Phase 3+:** deeper maintenance messaging/reviews/documents,
  production notification scheduling, E2E/RLS test expansion.
- **Phase 4:** controlled residential expansion, only after written
  operational guidance from the relevant authorities.
