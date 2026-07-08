-- Roadmap next items: listing media storage, enquiry messaging, viewings
-- workflow, and saved searches.

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'listing-public',
    'listing-public',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'verification-private',
    'verification-private',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do nothing;

create or replace function storage_space_id_from_path(path text)
returns uuid
language sql immutable set search_path = public as $$
  select nullif(split_part(path, '/', 1), '')::uuid;
$$;

revoke execute on function storage_space_id_from_path(text) from public, anon, authenticated;

-- Public listing photos: anyone reads; providers upload to their own space folder.
create policy "listing public read" on storage.objects
  for select
  using (bucket_id = 'listing-public');

create policy "provider listing upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-public'
    and owns_space(storage_space_id_from_path(name))
  );

create policy "provider listing update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-public'
    and owns_space(storage_space_id_from_path(name))
  )
  with check (
    bucket_id = 'listing-public'
    and owns_space(storage_space_id_from_path(name))
  );

create policy "provider listing delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-public'
    and owns_space(storage_space_id_from_path(name))
  );

-- Verification evidence: staff and verifiers only.
create policy "staff verification read" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-private' and is_staff());

create policy "staff verification upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-private' and is_staff());

create policy "staff verification update" on storage.objects
  for update to authenticated
  using (bucket_id = 'verification-private' and is_staff())
  with check (bucket_id = 'verification-private' and is_staff());

create policy "staff verification delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-private' and is_staff());

-- ---------------------------------------------------------------------------
-- Space media bucket column
-- ---------------------------------------------------------------------------

alter table space_media
  add column if not exists bucket text not null default 'listing-public';

alter table space_media
  add constraint space_media_bucket_check
  check (bucket in ('listing-public', 'verification-private'));

-- ---------------------------------------------------------------------------
-- Public listings view: include cover image path
-- ---------------------------------------------------------------------------

drop view if exists public_listings;

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
  l.created_at,
  cover.storage_path as cover_image_path,
  cover.bucket as cover_image_bucket
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

-- ---------------------------------------------------------------------------
-- Enquiry status and threaded messages
-- ---------------------------------------------------------------------------

alter table enquiries
  add column if not exists status text not null default 'open';

alter table enquiries
  add constraint enquiries_status_check
  check (status in ('open', 'closed', 'withdrawn'));

create table enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  sender_id uuid references profiles (id) on delete set null,
  sender_role text not null check (sender_role in ('seeker', 'provider', 'staff')),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index enquiry_messages_enquiry_idx
  on enquiry_messages (enquiry_id, created_at);

-- Backfill the opening message from legacy enquiry rows.
insert into enquiry_messages (enquiry_id, sender_id, sender_role, body, created_at)
select
  e.id,
  e.seeker_id,
  'seeker',
  coalesce(nullif(trim(e.message), ''), 'Enquiry sent'),
  e.created_at
from enquiries e
where not exists (
  select 1 from enquiry_messages em where em.enquiry_id = e.id
);

-- ---------------------------------------------------------------------------
-- Viewings workflow
-- ---------------------------------------------------------------------------

create type viewing_status as enum (
  'requested', 'proposed', 'confirmed', 'cancelled', 'completed'
);

alter table viewings
  add column if not exists status viewing_status not null default 'requested';

alter table viewings
  add column if not exists provider_notes text,
  add column if not exists alternative_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists location_released_at timestamptz,
  add column if not exists outcome text,
  add column if not exists cancelled_by text,
  add column if not exists cancel_reason text;

update viewings
set status = case when confirmed then 'confirmed'::viewing_status else 'requested'::viewing_status end,
    confirmed_at = case when confirmed then created_at else null end
where status = 'requested' and confirmed = true;

alter table viewings drop column if exists confirmed;

create index viewings_enquiry_idx on viewings (enquiry_id);
create index viewings_status_idx on viewings (status);

-- ---------------------------------------------------------------------------
-- Saved searches
-- ---------------------------------------------------------------------------

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  criteria jsonb not null default '{}',
  channel text not null default 'email'
    check (channel in ('email', 'whatsapp', 'in_app')),
  frequency text not null default 'weekly'
    check (frequency in ('daily', 'weekly', 'instant')),
  paused boolean not null default false,
  last_matched_at timestamptz,
  created_at timestamptz not null default now()
);

create index saved_searches_user_idx on saved_searches (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on enquiry_messages to authenticated;
grant select, insert, update on saved_searches to authenticated;
grant update on viewings to authenticated;

alter table enquiry_messages enable row level security;
alter table saved_searches enable row level security;

-- Enquiry messages: participants in the enquiry thread only.
create policy "enquiry message read" on enquiry_messages
  for select to authenticated
  using (
    exists (
      select 1 from enquiries e
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where e.id = enquiry_messages.enquiry_id
        and (
          e.seeker_id = (select auth.uid())
          or s.provider_id = (select auth.uid())
          or is_staff()
        )
    )
  );

create policy "enquiry message insert" on enquiry_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from enquiries e
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where e.id = enquiry_messages.enquiry_id
        and e.status = 'open'
        and (
          (enquiry_messages.sender_role = 'seeker' and e.seeker_id = (select auth.uid()))
          or (enquiry_messages.sender_role = 'provider' and s.provider_id = (select auth.uid()))
          or (enquiry_messages.sender_role = 'staff' and is_staff())
        )
    )
  );

-- Enquiry status updates by participants.
create policy "enquiry status update" on enquiries
  for update to authenticated
  using (
    seeker_id = (select auth.uid())
    or is_staff()
    or exists (
      select 1 from listings l
      join spaces s on s.id = l.space_id
      where l.id = enquiries.listing_id
        and s.provider_id = (select auth.uid())
    )
  )
  with check (
    seeker_id = (select auth.uid())
    or is_staff()
    or exists (
      select 1 from listings l
      join spaces s on s.id = l.space_id
      where l.id = enquiries.listing_id
        and s.provider_id = (select auth.uid())
    )
  );

-- Viewings: read/write for enquiry participants.
drop policy if exists "viewing read" on viewings;
drop policy if exists "viewing insert" on viewings;

create policy "viewing read" on viewings
  for select
  using (
    exists (
      select 1 from enquiries e
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where e.id = viewings.enquiry_id
        and (
          e.seeker_id = (select auth.uid())
          or s.provider_id = (select auth.uid())
          or is_staff()
        )
    )
  );

create policy "viewing insert" on viewings
  for insert
  with check (
    exists (
      select 1 from enquiries e
      where e.id = viewings.enquiry_id
        and e.status = 'open'
        and (
          e.seeker_id = (select auth.uid())
          or exists (
            select 1 from listings l
            join spaces s on s.id = l.space_id
            where l.id = e.listing_id
              and s.provider_id = (select auth.uid())
          )
          or is_staff()
        )
    )
  );

create policy "viewing update" on viewings
  for update to authenticated
  using (
    exists (
      select 1 from enquiries e
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where e.id = viewings.enquiry_id
        and (
          e.seeker_id = (select auth.uid())
          or s.provider_id = (select auth.uid())
          or is_staff()
        )
    )
  )
  with check (
    exists (
      select 1 from enquiries e
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where e.id = viewings.enquiry_id
        and (
          e.seeker_id = (select auth.uid())
          or s.provider_id = (select auth.uid())
          or is_staff()
        )
    )
  );

-- Saved searches: private to each user.
create policy "own saved searches" on saved_searches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
