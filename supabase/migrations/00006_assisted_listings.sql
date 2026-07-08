-- Assisted listing requests: a field representative visits, photographs and
-- publishes on behalf of providers who cannot use the app themselves.

create table assisted_listing_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  contact text not null,
  zone_id uuid references zones (id) on delete set null,
  category space_category,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'scheduled', 'completed', 'declined')),
  requester_id uuid references profiles (id) on delete set null,
  handled_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index assisted_listing_requests_status_idx
  on assisted_listing_requests (status, created_at);

grant insert on assisted_listing_requests to anon, authenticated;
grant select, update on assisted_listing_requests to authenticated;

alter table assisted_listing_requests enable row level security;

-- Anyone (including offline-first users without accounts) may ask for help.
create policy "assisted request insert" on assisted_listing_requests
  for insert with check (true);

create policy "staff assisted request read" on assisted_listing_requests
  for select to authenticated using (is_staff());

create policy "staff assisted request update" on assisted_listing_requests
  for update to authenticated using (is_staff()) with check (is_staff());
