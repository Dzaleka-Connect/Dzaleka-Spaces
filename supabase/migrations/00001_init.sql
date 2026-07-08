-- Dzaleka Spaces — Phase 1 marketplace schema
-- Spaces are separated from listings so a space keeps its history when re-advertised.
-- No land sales, no ownership records: providers record an "authority to offer" basis only.

create type space_category as enum (
  'community_venue', 'training_space', 'meeting_venue', 'office',
  'shop', 'workshop', 'storage', 'homestay'
);

create type billing_period as enum ('daily', 'monthly');

create type listing_status as enum (
  'draft', 'pending_review', 'published', 'paused', 'archived', 'rejected'
);

create type verification_status as enum (
  'pending', 'scheduled', 'approved', 'rejected', 'expired'
);

create type authority_basis as enum (
  'current_recognised_occupier', 'organisation_manager', 'venue_operator',
  'family_representative', 'authorised_agent', 'other_documented'
);

create type app_role as enum (
  'seeker', 'provider', 'field_verifier', 'service_provider',
  'organisation_manager', 'moderator', 'admin', 'finance'
);

create type report_reason as enum (
  'false_listing', 'unreturned_deposit', 'unauthorised_listing', 'harassment',
  'unsafe_conditions', 'duplicate_listing', 'fraudulent_payment', 'privacy',
  'discrimination', 'threatened_removal', 'other'
);

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  whatsapp text,
  preferred_language text default 'en',
  created_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references profiles (id) on delete cascade,
  role app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- SECURITY DEFINER is required to avoid recursive RLS on user_roles; both
-- functions only reveal facts about the caller's own roles.
create or replace function has_role(check_role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = (select auth.uid()) and role = check_role
  );
$$;

create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = (select auth.uid())
      and role in ('moderator', 'admin', 'field_verifier')
  );
$$;

-- Auto-create a profile on signup. Trigger-only: not callable via the API.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into user_roles (user_id, role) values (new.id, 'seeker');
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Spaces and listings
-- ---------------------------------------------------------------------------

create table spaces (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references profiles (id) on delete set null,
  category space_category not null,
  zone text not null,
  landmark text not null,          -- public approximate location only
  description text not null,
  rooms int,
  capacity int,
  facilities text[] not null default '{}',
  accessibility_notes text,
  created_at timestamptz not null default now()
);

-- Exact locations and authority evidence are staff-only, kept out of the
-- public tables entirely per the location-privacy model.
create table space_internal (
  space_id uuid primary key references spaces (id) on delete cascade,
  exact_location text,
  authority_basis authority_basis,
  authority_notes text,
  created_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces (id) on delete cascade,
  title text not null,
  price_mwk int not null check (price_mwk >= 0),
  deposit_mwk int check (deposit_mwk >= 0),
  billing_period billing_period not null default 'monthly',
  available_from date,
  status listing_status not null default 'pending_review',
  featured_until timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index listings_status_idx on listings (status);
create index listings_space_idx on listings (space_id);

-- These two break the spaces<->listings RLS reference cycle (which otherwise
-- causes "infinite recursion detected in policy"). SECURITY DEFINER so the
-- check itself bypasses RLS on the referenced table; each reveals only a
-- boolean about a published listing or the caller's provider relationship.
create or replace function space_has_published_listing(sid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from listings where space_id = sid and status = 'published'
  );
$$;

create or replace function owns_space(sid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from spaces
    where id = sid and provider_id = (select auth.uid())
  );
$$;

create table space_media (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------

create table verifications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  verifier_id uuid references profiles (id) on delete set null,
  status verification_status not null default 'pending',
  checklist jsonb not null default '{}',
  notes text,
  verified_at timestamptz,
  reverify_by date,
  created_at timestamptz not null default now()
);

create index verifications_listing_idx on verifications (listing_id);

-- Public "verified" flag without exposing verification evidence: anonymous
-- readers cannot select from verifications (RLS), so the view derives the
-- badge through this SECURITY DEFINER lookup that reveals only the timestamp.
create or replace function listing_verified_at(lid uuid)
returns timestamptz
language sql stable security definer set search_path = public as $$
  select verified_at from verifications
  where listing_id = lid and status = 'approved'
  order by verified_at desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Enquiries, viewings, saved listings, reports
-- ---------------------------------------------------------------------------

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  seeker_id uuid references profiles (id) on delete set null,
  name text not null,
  contact text not null,
  channel text not null default 'whatsapp',
  message text,
  created_at timestamptz not null default now()
);

create table viewings (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  proposed_at timestamptz not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table saved_listings (
  user_id uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings (id) on delete set null,
  reporter_id uuid references profiles (id) on delete set null,
  reason report_reason not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Public marketplace view (flattens listing + space + verification)
-- ---------------------------------------------------------------------------

create view public_listings
with (security_invoker = on) as
select
  l.id,
  l.title,
  s.category,
  s.zone,
  s.landmark,
  s.description,
  s.rooms,
  s.capacity,
  s.facilities,
  l.price_mwk,
  l.deposit_mwk,
  l.billing_period,
  l.available_from,
  (v.verified_at is not null) as verified,
  v.verified_at,
  (l.featured_until is not null and l.featured_until > now()) as featured,
  p.full_name as provider_name,
  p.whatsapp,
  l.created_at
from listings l
join spaces s on s.id = l.space_id
left join profiles p on p.id = s.provider_id
cross join lateral (
  select listing_verified_at(l.id) as verified_at
) v
where l.status = 'published';

-- ---------------------------------------------------------------------------
-- Data API exposure. Since April 2026 new tables in public are NOT exposed
-- automatically; grants gate table access, RLS below gates rows.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on enquiries, viewings, reports to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table spaces enable row level security;
alter table space_internal enable row level security;
alter table listings enable row level security;
alter table space_media enable row level security;
alter table verifications enable row level security;
alter table enquiries enable row level security;
alter table viewings enable row level security;
alter table saved_listings enable row level security;
alter table reports enable row level security;
alter table audit_events enable row level security;

-- Profiles: users manage their own; provider names on published listings are
-- exposed through the public_listings view via the select policy below.
create policy "own profile read" on profiles
  for select using ((select auth.uid()) = id or is_staff());
create policy "public provider names" on profiles
  for select using (
    exists (
      select 1 from spaces s
      join listings l on l.space_id = s.id
      where s.provider_id = profiles.id and l.status = 'published'
    )
  );
create policy "own profile update" on profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "own roles read" on user_roles
  for select using ((select auth.uid()) = user_id or is_staff());

-- Spaces: anyone can read spaces behind a published listing; providers manage
-- their own; staff see everything.
create policy "public spaces read" on spaces
  for select using (
    space_has_published_listing(id)
    or provider_id = (select auth.uid())
    or is_staff()
  );
create policy "provider creates space" on spaces
  for insert to authenticated
  with check (provider_id = (select auth.uid()));
create policy "provider updates space" on spaces
  for update to authenticated
  using (provider_id = (select auth.uid()) or is_staff())
  with check (provider_id = (select auth.uid()) or is_staff());

-- Internal space data: staff only (providers may write on submission).
create policy "staff internal read" on space_internal
  for select using (is_staff());
create policy "provider internal insert" on space_internal
  for insert to authenticated
  with check (owns_space(space_id));
create policy "staff internal update" on space_internal
  for update using (is_staff()) with check (is_staff());

-- Listings
create policy "public listings read" on listings
  for select using (
    status = 'published' or is_staff() or owns_space(space_id)
  );
create policy "provider creates listing" on listings
  for insert to authenticated
  with check (owns_space(space_id));
create policy "provider or staff updates listing" on listings
  for update to authenticated
  using (is_staff() or owns_space(space_id))
  with check (is_staff() or owns_space(space_id));

-- Media: public photos of published listings; providers and staff see all.
create policy "public media read" on space_media
  for select using (
    (is_public and space_has_published_listing(space_id))
    or is_staff()
    or owns_space(space_id)
  );
create policy "provider adds media" on space_media
  for insert to authenticated
  with check (owns_space(space_id));

-- Verifications: staff manage; providers can see status of their own listings.
create policy "verification read" on verifications
  for select using (
    is_staff()
    or exists (
      select 1 from listings l
      join spaces s on s.id = l.space_id
      where l.id = verifications.listing_id
        and s.provider_id = (select auth.uid())
    )
  );
create policy "staff verification write" on verifications
  for insert to authenticated with check (is_staff());
create policy "staff verification update" on verifications
  for update to authenticated using (is_staff()) with check (is_staff());

-- Enquiries: anyone (including anonymous) may enquire on a published listing;
-- readable by the enquirer, the listing provider and staff.
create policy "enquiry insert" on enquiries
  for insert with check (
    exists (
      select 1 from listings l
      where l.id = enquiries.listing_id and l.status = 'published'
    )
  );
create policy "enquiry read" on enquiries
  for select using (
    seeker_id = (select auth.uid())
    or is_staff()
    or exists (
      select 1 from listings l
      join spaces s on s.id = l.space_id
      where l.id = enquiries.listing_id
        and s.provider_id = (select auth.uid())
    )
  );

create policy "viewing read" on viewings
  for select using (
    exists (select 1 from enquiries e where e.id = viewings.enquiry_id)
  );
create policy "viewing insert" on viewings
  for insert with check (true);

-- Saved listings: private to each user.
create policy "own saved" on saved_listings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Reports: anyone can file; only staff can read (protects reporters).
create policy "report insert" on reports
  for insert with check (true);
create policy "staff report read" on reports
  for select using (is_staff());
create policy "staff report update" on reports
  for update to authenticated using (is_staff()) with check (is_staff());

-- Audit: staff read, system writes via service role.
create policy "staff audit read" on audit_events
  for select using (has_role('admin'));
