-- Residential pilot enablement + short-stay billing.
--
-- Platform-owner decision (2026-07-13): enable residential_listings,
-- family_accommodation and public_map. Per the release-control policy these
-- protected flags can only change through a reviewed migration — the admin UI
-- and direct SQL updates are blocked by protected_feature_flags_guard — so
-- this migration is that review artefact. Custody (payment_processing,
-- mobile_money_*, deposit_*) and SMS/WhatsApp/web-push locks are unchanged:
-- the platform still never initiates payments, holds funds, or messages
-- outside email/in-app.
--
-- Also adds short-stay support for visiting families: a 'weekly' billing
-- period and optional minimum/maximum stay lengths (days) on listings.

-- ---------------------------------------------------------------------------
-- 1. Narrow the protected-flag blocklist: residential and family
--    accommodation leave the list; custody and messaging locks remain.
-- ---------------------------------------------------------------------------

create or replace function enforce_protected_feature_flags()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.enabled and new.name in (
    'payment_processing', 'mobile_money_processing',
    'mobile_money_integrations', 'deposit_custody', 'deposit_processing',
    'sms_notifications', 'whatsapp_notifications', 'web_push_notifications'
  ) then
    raise exception 'Feature % requires an external operational approval and cannot be enabled in-app', new.name;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function enforce_protected_feature_flags()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Enable the three flags and record the decision in their descriptions.
-- ---------------------------------------------------------------------------

update feature_flags
set enabled = true,
    description = 'Residential room and shared-accommodation listings. Enabled by platform-owner decision on 2026-07-13 (migration 00016); every listing still passes authority review, field verification and moderation before publication.'
where name = 'residential_listings';

update feature_flags
set enabled = true,
    description = 'Family accommodation listings, including short visitor stays. Enabled by platform-owner decision on 2026-07-13 (migration 00016); same verification pipeline as all other categories.'
where name = 'family_accommodation';

update feature_flags
set enabled = true,
    description = 'Privacy-safe public map with approximate zone/landmark markers only. Enabled 2026-07-13; exact household locations are never shown.'
where name = 'public_map';

-- ---------------------------------------------------------------------------
-- 3. Short-stay billing: weekly period + stay-length bounds on listings.
--    (The new enum value is not used inside this transaction.)
-- ---------------------------------------------------------------------------

alter type billing_period add value if not exists 'weekly';

alter table listings
  add column if not exists min_stay_days int,
  add column if not exists max_stay_days int;

alter table listings
  add constraint listings_min_stay_days_check
    check (min_stay_days is null or min_stay_days >= 1),
  add constraint listings_max_stay_days_check
    check (max_stay_days is null or max_stay_days >= 1),
  add constraint listings_stay_range_check
    check (
      min_stay_days is null
      or max_stay_days is null
      or max_stay_days >= min_stay_days
    );

-- ---------------------------------------------------------------------------
-- 4. Expose stay bounds through the public view (columns appended at the
--    end so create-or-replace keeps the existing column order).
-- ---------------------------------------------------------------------------

create or replace view public_listings
with (security_invoker = on) as
select
  l.id,
  l.slug,
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
  l.created_at,
  cover.storage_path as cover_image_path,
  cover.bucket as cover_image_bucket,
  l.min_stay_days,
  l.max_stay_days
from listings l
join spaces s on s.id = l.space_id
join zones z on z.id = s.zone_id
left join profiles p on p.id = s.provider_id
cross join lateral (
  select listing_verified_at(l.id) as verified_at
) v
left join lateral (
  select sm.storage_path, sm.bucket
  from space_media sm
  where sm.space_id = s.id
    and sm.is_public = true
    and sm.bucket = 'listing-public'
  order by sm.sort_order, sm.created_at
  limit 1
) cover on true
where l.status = 'published';

grant select on public_listings to anon, authenticated;
