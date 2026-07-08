-- Backend foundations from the architecture plan:
-- zones/landmarks as tables, feature flags (residential gated off), database-
-- enforced publication rules, verifier separation of duties, richer audit
-- events, and search/geo extensions with the planned indexes.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Zones and landmarks
-- ---------------------------------------------------------------------------

create table zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table landmarks (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zones (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (zone_id, name)
);

insert into zones (name, sort_order) values
  ('Kawale 1', 1),
  ('Kawale 2', 2),
  ('Likuni 1', 3),
  ('Likuni 2', 4),
  ('Lisungwi', 5),
  ('Katudza', 6),
  ('New Katubza', 7),
  ('Zomba', 8),
  ('Blantyre', 9),
  ('Karonga', 10),
  ('Dzaleka Hill', 11),
  ('Other recognised area', 99);

-- Move spaces from a free-text zone to a zone_id foreign key.
alter table spaces add column zone_id uuid references zones (id);

update spaces s
set zone_id = z.id
from zones z
where z.name = s.zone;

alter table spaces alter column zone_id set not null;

-- The public view reads the zone name through the join from now on.
drop view public_listings;
alter table spaces drop column zone;

create view public_listings
with (security_invoker = on) as
select
  l.id,
  l.title,
  s.category,
  z.name as zone,
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
join zones z on z.id = s.zone_id
left join profiles p on p.id = s.provider_id
cross join lateral (
  select listing_verified_at(l.id) as verified_at
) v
where l.status = 'published';

grant select on public_listings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Feature flags (residential stays off until written operational guidance)
-- ---------------------------------------------------------------------------

create table feature_flags (
  name text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

insert into feature_flags (name, enabled, description) values
  ('residential_listings', false, 'Rooms/shared/family accommodation. Requires written operational guidance before enabling.'),
  ('family_accommodation', false, 'Entire family shelters. Stricter gate than residential_listings.'),
  ('mobile_money_processing', false, 'Actual payment processing (pilot is ledger-only).'),
  ('deposit_processing', false, 'Deposit custody. Prohibited during pilot.'),
  ('public_map', false, 'Approximate map points on public listings.'),
  ('maintenance_marketplace', false, 'Phase 3 service-provider marketplace.'),
  ('featured_listings', true, 'Paid featured placement.'),
  ('organisation_accounts', false, 'Organisation membership and shared dashboards.'),
  ('whatsapp_notifications', false, 'Outbound WhatsApp notifications.'),
  ('saved_search_alerts', false, 'Saved-search alert delivery.');

create or replace function feature_enabled(flag text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select enabled from feature_flags where name = flag),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Space types: residential categories exist in the enum but publication is
-- blocked by the residential_listings flag below.
-- ---------------------------------------------------------------------------

alter type space_category add value if not exists 'room';
alter type space_category add value if not exists 'shared_room';
alter type space_category add value if not exists 'family_accommodation';
alter type space_category add value if not exists 'other';

alter type listing_status add value if not exists 'submitted';
alter type listing_status add value if not exists 'under_review';
alter type listing_status add value if not exists 'changes_requested';
alter type listing_status add value if not exists 'approved';
alter type listing_status add value if not exists 'matched';
alter type listing_status add value if not exists 'expired';

-- ---------------------------------------------------------------------------
-- Publication rules enforced in the database, not just the frontend
-- ---------------------------------------------------------------------------

-- One active public listing per space.
create unique index one_published_listing_per_space
  on listings (space_id) where (status = 'published');

-- SECURITY DEFINER: the checks read spaces/space_internal/feature_flags,
-- which the publishing provider cannot fully read under RLS. Trigger
-- functions are not callable through the Data API.
create or replace function enforce_listing_publication()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  space_rec record;
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then

    select s.category, s.zone_id into space_rec
    from spaces s where s.id = new.space_id;

    if space_rec.zone_id is null then
      raise exception 'Listing cannot be published without a zone';
    end if;

    if space_rec.category::text in ('room', 'shared_room')
       and not feature_enabled('residential_listings') then
      raise exception 'Residential listings are not yet enabled';
    end if;

    if space_rec.category::text = 'family_accommodation'
       and not feature_enabled('family_accommodation') then
      raise exception 'Family accommodation listings are not yet enabled';
    end if;

    if not exists (
      select 1 from space_internal si
      where si.space_id = new.space_id
        and si.authority_basis is not null
    ) then
      raise exception 'Listing cannot be published without an authority-to-offer record';
    end if;

    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

revoke execute on function enforce_listing_publication() from public, anon, authenticated;

create trigger listing_publication_guard
  before insert or update on listings
  for each row execute function enforce_listing_publication();

-- Separation of duties: a provider must never verify their own listing.
create or replace function enforce_verifier_separation()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.verifier_id is not null and exists (
    select 1
    from listings l
    join spaces s on s.id = l.space_id
    where l.id = new.listing_id and s.provider_id = new.verifier_id
  ) then
    raise exception 'A provider cannot verify their own listing';
  end if;
  return new;
end;
$$;

revoke execute on function enforce_verifier_separation() from public, anon, authenticated;

create trigger verifier_separation_guard
  before insert or update on verifications
  for each row execute function enforce_verifier_separation();

-- ---------------------------------------------------------------------------
-- Restricted verification coordinates (PostGIS) — staff-only table already
-- ---------------------------------------------------------------------------

alter table space_internal
  add column exact_point extensions.geography(point, 4326);

-- ---------------------------------------------------------------------------
-- Audit events: before/after state and request correlation
-- ---------------------------------------------------------------------------

alter table audit_events
  add column actor_role text,
  add column before_state jsonb,
  add column after_state jsonb,
  add column request_id uuid,
  add column ip_hash text,
  add column device_id uuid;

-- ---------------------------------------------------------------------------
-- Indexes from the architecture plan (existing tables only)
-- ---------------------------------------------------------------------------

create index listings_price_idx on listings (price_mwk);
create index listings_available_from_idx on listings (available_from);
create index listings_expires_idx on listings (expires_at);
create index spaces_zone_category_idx on spaces (zone_id, category);
create index spaces_provider_idx on spaces (provider_id);
create index enquiries_listing_idx on enquiries (listing_id);
create index enquiries_seeker_idx on enquiries (seeker_id, created_at);
create index verifications_status_idx on verifications (status);
create index reports_status_idx on reports (status);

create index listings_title_trgm_idx
  on listings using gin (title extensions.gin_trgm_ops);
create index spaces_description_trgm_idx
  on spaces using gin (description extensions.gin_trgm_ops);
create index spaces_landmark_trgm_idx
  on spaces using gin (landmark extensions.gin_trgm_ops);
create index space_internal_exact_point_idx
  on space_internal using gist (exact_point);

-- ---------------------------------------------------------------------------
-- Grants + RLS for the new tables (tables are not auto-exposed)
-- ---------------------------------------------------------------------------

grant select on zones, landmarks, feature_flags to anon, authenticated;

alter table zones enable row level security;
alter table landmarks enable row level security;
alter table feature_flags enable row level security;

create policy "zones are public" on zones
  for select using (active);
create policy "landmarks are public" on landmarks
  for select using (true);
create policy "flags readable" on feature_flags
  for select using (true);
