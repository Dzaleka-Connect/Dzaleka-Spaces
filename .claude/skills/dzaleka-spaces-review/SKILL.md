---
name: dzaleka-spaces-review
description: >-
  Review the Dzaleka Spaces codebase for bugs, incomplete/stub implementations,
  UI "slop", and violations of the platform's hard product constraints. Use this
  skill whenever the user asks to review, audit, "check for bugs", find
  incomplete work, sanity-check a feature, says something "looks slopey" or
  "basic", or is about to commit/ship — even if they don't name the skill. Also
  use it proactively after building a feature in this repo, before declaring
  work done.
---

# Dzaleka Spaces review

A structured review pass for this Next.js (App Router) + Supabase + shadcn/ui
marketplace. The goal is to catch the four things that actually go wrong here:
**functional bugs**, **incomplete implementations**, **UI slop**, and
**product-constraint violations**. The last one matters most — this platform
serves a refugee camp and has hard ethical/legal boundaries.

Work through the four dimensions below. Prefer running the mechanical checks
(greps, build, RLS tests) first — they are fast and objective — then read the
flagged files. Report findings grouped by severity with `file:line`, fix the
clear-cut ones, and leave judgement calls for the user.

## 0. Fast mechanical baseline

Run these first; they surface most issues in seconds:

```bash
npm run lint && npm run typecheck && npm run build   # must all pass
npm run test:rls                                      # RLS + workflow guards (skips w/o DIRECT_URL)
```

Then the cheap greps in `references/checks.md` (dead links, stubs, debug logs,
redirect-in-try). Read that file for the exact commands — they are copy-paste
ready and tuned for this repo's layout.

## 1. Functional bugs

Look specifically for the traps this stack invites:

- **`redirect()` / `notFound()` inside a `try/catch`.** Next implements these by
  throwing; a surrounding `catch` swallows the navigation and the user is
  silently stuck. They belong outside try blocks.
- **Missing `await` on Supabase calls.** `const { data } = supabase.from(...)`
  without `await` returns a builder (truthy), so the code "works" but never
  queries. Note: `let query = supabase.from(...)` that is awaited later is fine.
- **New table exposed without the full trio.** Every table in `public` needs
  `GRANT` + RLS enabled + policies. A table with RLS on but no policy silently
  returns zero rows; a table with grants but no RLS leaks everything. Verify new
  migrations add all three, and add an anon-exposure assertion to
  `scripts/test-rls.mjs`.
- **Private data leaking into a public view.** `public_listings` and anything
  anon can read must never expose exact location, authority evidence,
  verification checklists, reporter identity, or contact details.
- **Secrets in `NEXT_PUBLIC_`.** Only the Supabase URL and publishable key may be
  public. `DIRECT_URL`, service keys and `RESEND_API_KEY` are server-only.
- **Uncontrolled→controlled component warnings.** A Base UI `defaultOpen`/
  `defaultValue` derived from a value that changes on navigation (e.g.
  pathname) warns and misbehaves. Make it controlled, and sync prop→state with
  the render-time previous-value pattern, **not** `setState` in `useEffect`
  (the React Compiler lint rule `react-hooks/set-state-in-effect` forbids it).
- **Dead internal links** and **empty handlers** (`onClick={() => {}}`,
  `href="#"`, forms with no `action`).

## 2. Incomplete implementations

- **Stub pages**: a route whose `page.tsx` is short and renders no real data
  (no `lib/*` call or `supabase.from`). Compare against sibling pages.
- **Features with no entry point**: a working page (e.g. `/compare`) that
  nothing links to. Either wire an affordance or note it.
- **Disabled adapters that silently no-op**: payment/notification adapters are
  intentionally disabled in the pilot, but they must fail loudly or clearly
  report a disabled state, never pretend success. Unused params in a disabled
  adapter are expected — don't "fix" them into fake behaviour.
- **`TODO`/`FIXME`/"coming soon"** left in shipped paths.
- Confirm the feature is reachable, gated by the right role, and its flag state
  matches intent (see constraints below).

## 3. UI slop

The house style is **restraint with a clear semantic palette**. Flag and fix:

- **Generic gradients and filler.** Decorative multi-stop gradients, low-opacity
  icons dropped in a corner to fill space, placeholder blobs. Prefer a calm
  solid surface and one meaningful element.
- **Badge/chip soup and duplicated signals.** Don't stack a ring *and* a pill
  *and* a badge for the same state. One clear indicator per status.
- **No hierarchy.** Price and primary action should be prominent; secondary meta
  should recede to muted one-liners, not a row of filled chips.
- **Palette misuse.** Brand = teal `--primary`; **Verified = emerald
  `--success`**; **Featured = amber `--featured`**; destructive = red. Verified
  must visibly stand out (it's the trust signal). Never reintroduce the old
  all-grey look; never use raw Tailwind colors — use the semantic tokens.
- Reference: a good card is price-first, one status chip per corner, a calm
  image area, and a single muted meta line. See `src/components/listing-card.tsx`.

## 4. Product constraints (highest priority)

These are non-negotiable. A violation is more serious than any bug. Full list in
`AGENTS.md`; the ones to actively check in any review:

- **No land or shelter sales, no ownership claims.** Verification confirms a
  provider's *stated authority to offer* — never ownership. Language is "space
  provider" and "authority to offer", never landlord/title/owner.
- **No fund custody.** Payments are *recorded* (ledger + receipts), never held
  or processed. `deposit_processing` / `mobile_money_processing` stay off.
- **Residential is gated.** `room` / `shared_room` / `family_accommodation`
  publication is trigger-blocked until the matching feature flag is enabled.
  Don't bypass the DB guard.
- **Location & identity privacy.** Public surfaces show zone + landmark only.
  Never expose exact coordinates, refugee ID numbers, or identity documents.
- **Demo mode must keep working.** Public data helpers fall back to demo data
  when Supabase env vars are absent; changes must not break that path.

## Output format

Report like this, most severe first, and fix the unambiguous items as you go:

```
## Review: <scope>

### Constraint violations (fix immediately)
- path/file.tsx:NN — <what and why it violates the boundary>

### Bugs
- path/file.ts:NN — <symptom → cause → fix>

### Incomplete
- path/route — <what's missing / no entry point>

### UI / polish
- component.tsx — <slop pattern → cleaner approach>

### Clean bill
- <checks that passed: lint/typecheck/build/test:rls, greps with no hits>
```

Be honest about a clean result — if the mechanical checks pass and the greps are
empty, say so plainly rather than inventing findings. A short, true "clean bill"
is more useful than a padded list.
