-- Operations marketplace, notification outbox, provider teams, admin
-- operations, listing slugs, private enquiry attachments and verifier sync.

create extension if not exists pg_cron;

do $$ begin
  create type maintenance_ticket_status as enum (
    'open', 'triaged', 'quoted', 'assigned', 'in_progress',
    'completed', 'cancelled', 'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type maintenance_quote_status as enum (
    'draft', 'submitted', 'accepted', 'declined', 'withdrawn'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type work_order_status as enum (
    'scheduled', 'in_progress', 'awaiting_confirmation',
    'completed', 'cancelled', 'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type notification_status as enum (
    'pending', 'processing', 'sent', 'failed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type case_status as enum (
    'open', 'triaged', 'waiting', 'resolved', 'closed'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles: keep a server-side copy of email for notifications.
-- ---------------------------------------------------------------------------

alter table profiles add column if not exists email text;

create unique index if not exists profiles_email_unique
  on profiles (lower(email)) where email is not null;

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  insert into user_roles (user_id, role) values (new.id, 'seeker');
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Listing slugs.
-- ---------------------------------------------------------------------------

create or replace function listing_slug_from_title(title text, listing_id uuid)
returns text
language sql immutable set search_path = public as $$
  select trim(both '-' from lower(
    regexp_replace(
      regexp_replace(coalesce(title, 'listing'), '[^a-zA-Z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  )) || '-' || left(listing_id::text, 8);
$$;

alter table listings add column if not exists slug text;

update listings
set slug = listing_slug_from_title(title, id)
where slug is null or slug = '';

alter table listings alter column slug set not null;

create unique index if not exists listings_slug_unique on listings (slug);

drop view if exists public_listings;

create view public_listings
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
-- Provider team permissions.
-- ---------------------------------------------------------------------------

create table provider_team_members (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  permissions text[] not null default '{}',
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (provider_id, member_id)
);

create index provider_team_provider_idx
  on provider_team_members (provider_id, status);
create index provider_team_member_idx
  on provider_team_members (member_id, status);

create or replace function provider_team_has(provider uuid, permission text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from provider_team_members pt
    where pt.provider_id = provider
      and pt.member_id = (select auth.uid())
      and pt.status = 'active'
      and (
        'full_manager' = any(pt.permissions)
        or permission = any(pt.permissions)
      )
  );
$$;

create or replace function owns_space(sid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from spaces
    where id = sid
      and (
        provider_id = (select auth.uid())
        or provider_team_has(provider_id, 'manage_spaces')
        or provider_team_has(provider_id, 'manage_listings')
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Maintenance marketplace and /trades portal data.
-- ---------------------------------------------------------------------------

create table service_provider_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  display_name text not null,
  bio text,
  categories text[] not null default '{}',
  zones_served text[] not null default '{}',
  languages text[] not null default '{}',
  phone text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'suspended')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces (id) on delete set null,
  occupancy_id uuid references occupancies (id) on delete set null,
  requester_id uuid references profiles (id) on delete set null,
  assigned_service_provider_id uuid references profiles (id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'urgent')),
  status maintenance_ticket_status not null default 'open',
  zone_id uuid references zones (id) on delete set null,
  landmark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table maintenance_quotes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references maintenance_tickets (id) on delete cascade,
  service_provider_id uuid not null references profiles (id) on delete cascade,
  amount_mwk int not null check (amount_mwk >= 0),
  timeline text,
  notes text,
  status maintenance_quote_status not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (ticket_id, service_provider_id)
);

create table maintenance_work_orders (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references maintenance_tickets (id) on delete cascade,
  quote_id uuid references maintenance_quotes (id) on delete set null,
  service_provider_id uuid not null references profiles (id) on delete cascade,
  scheduled_for timestamptz,
  status work_order_status not null default 'scheduled',
  completion_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index maintenance_tickets_status_idx
  on maintenance_tickets (status, created_at desc);
create index maintenance_tickets_provider_idx
  on maintenance_tickets (assigned_service_provider_id, status);
create index maintenance_quotes_provider_idx
  on maintenance_quotes (service_provider_id, status);
create index maintenance_work_orders_provider_idx
  on maintenance_work_orders (service_provider_id, status);

-- ---------------------------------------------------------------------------
-- Private enquiry/message attachments.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'message-private',
    'message-private',
    false,
    10485760,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain'
    ]
  ),
  (
    'maintenance-private',
    'maintenance-private',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
on conflict (id) do nothing;

create table enquiry_attachments (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  message_id uuid references enquiry_messages (id) on delete cascade,
  uploader_id uuid references profiles (id) on delete set null,
  bucket text not null default 'message-private',
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create index enquiry_attachments_enquiry_idx
  on enquiry_attachments (enquiry_id, created_at);

create or replace function can_access_enquiry(eid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from enquiries e
    join listings l on l.id = e.listing_id
    join spaces s on s.id = l.space_id
    where e.id = eid
      and (
        e.seeker_id = (select auth.uid())
        or s.provider_id = (select auth.uid())
        or provider_team_has(s.provider_id, 'respond_enquiries')
        or is_staff()
      )
  );
$$;

create or replace function storage_enquiry_id_from_path(path text)
returns uuid
language sql immutable set search_path = public as $$
  select nullif(split_part(path, '/', 1), '')::uuid;
$$;

revoke execute on function storage_enquiry_id_from_path(text)
  from public, anon, authenticated;

create policy "message attachment object read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-private'
    and can_access_enquiry(storage_enquiry_id_from_path(name))
  );

create policy "message attachment object upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-private'
    and can_access_enquiry(storage_enquiry_id_from_path(name))
  );

-- ---------------------------------------------------------------------------
-- Notification outbox. Only server-side workers update delivery state.
-- ---------------------------------------------------------------------------

create table notification_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  email_enabled boolean not null default true,
  saved_search_alerts boolean not null default true,
  enquiry_messages boolean not null default true,
  maintenance_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

create table notification_templates (
  key text primary key,
  subject text not null,
  body_text text not null,
  updated_at timestamptz not null default now()
);

create table notification_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references profiles (id) on delete set null,
  recipient_email text not null,
  template_key text not null references notification_templates (key),
  subject text not null,
  body_text text not null,
  payload jsonb not null default '{}',
  status notification_status not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  error text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references notification_queue (id) on delete set null,
  provider text not null default 'resend',
  provider_message_id text,
  status notification_status not null,
  error text,
  created_at timestamptz not null default now()
);

create index notification_queue_pending_idx
  on notification_queue (status, next_attempt_at, created_at);

insert into notification_templates (key, subject, body_text) values
  (
    'enquiry_message',
    'New message about {{listing_title}}',
    'You have a new Dzaleka Spaces message about {{listing_title}}. Open {{url}} to reply.'
  ),
  (
    'saved_search_digest',
    'Saved search updates',
    'Review your saved Dzaleka Spaces search results at {{url}}.'
  ),
  (
    'maintenance_update',
    'Maintenance request update',
    'A maintenance request was updated. Open {{url}} to review it.'
  )
on conflict (key) do nothing;

create or replace function enqueue_notification(
  recipient_user uuid,
  recipient_email text,
  template_key text,
  subject text,
  body_text text,
  payload jsonb,
  idempotency_key text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inserted_id uuid;
begin
  if recipient_email is null or position('@' in recipient_email) = 0 then
    raise exception 'A valid recipient email is required';
  end if;

  insert into notification_queue (
    recipient_user_id,
    recipient_email,
    template_key,
    subject,
    body_text,
    payload,
    idempotency_key
  )
  values (
    recipient_user,
    recipient_email,
    template_key,
    subject,
    body_text,
    coalesce(payload, '{}'),
    idempotency_key
  )
  on conflict (idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke execute on function enqueue_notification(
  uuid, text, text, text, text, jsonb, text
) from public, anon, authenticated;

create or replace function enqueue_saved_search_alerts()
returns int
language plpgsql security definer set search_path = public as $$
declare
  row_count int := 0;
  saved record;
begin
  for saved in
    select ss.id, ss.user_id, p.email
    from saved_searches ss
    join profiles p on p.id = ss.user_id
    left join notification_preferences np on np.user_id = ss.user_id
    where ss.paused = false
      and ss.channel = 'email'
      and p.email is not null
      and coalesce(np.email_enabled, true)
      and coalesce(np.saved_search_alerts, true)
      and (
        ss.last_matched_at is null
        or ss.last_matched_at < now() - interval '1 day'
      )
  loop
    perform enqueue_notification(
      saved.user_id,
      saved.email,
      'saved_search_digest',
      'Saved search updates',
      'Review your saved Dzaleka Spaces search results.',
      jsonb_build_object('saved_search_id', saved.id, 'url', '/account/saved-searches'),
      'saved-search-digest/' || saved.id || '/' || to_char(now(), 'YYYY-MM-DD')
    );
    update saved_searches set last_matched_at = now() where id = saved.id;
    row_count := row_count + 1;
  end loop;

  return row_count;
end;
$$;

revoke execute on function enqueue_saved_search_alerts()
  from public, anon, authenticated;

select cron.schedule(
  'dzaleka-saved-search-alerts',
  '15 6 * * *',
  $$select enqueue_saved_search_alerts();$$
);

-- ---------------------------------------------------------------------------
-- Admin cases, content, analytics and settings.
-- ---------------------------------------------------------------------------

create table moderation_cases (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  status case_status not null default 'open',
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'urgent', 'protection_sensitive')),
  listing_id uuid references listings (id) on delete set null,
  report_id uuid references reports (id) on delete set null,
  assigned_to uuid references profiles (id) on delete set null,
  title text not null,
  summary text,
  restricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references moderation_cases (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create table content_pages (
  slug text primary key,
  title text not null,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  route text,
  actor_id uuid references profiles (id) on delete set null,
  anonymous_id text,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index moderation_cases_status_idx
  on moderation_cases (status, priority, created_at desc);
create index analytics_events_name_idx
  on analytics_events (event_name, created_at desc);

-- ---------------------------------------------------------------------------
-- Verifier offline sync queue.
-- ---------------------------------------------------------------------------

create table verifier_sync_events (
  id uuid primary key default gen_random_uuid(),
  client_generated_id text not null,
  verifier_id uuid not null references profiles (id) on delete cascade,
  assignment_id uuid references listings (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued'
    check (status in ('queued', 'applied', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (verifier_id, client_generated_id)
);

-- ---------------------------------------------------------------------------
-- Feature flags and grants.
-- ---------------------------------------------------------------------------

insert into feature_flags (name, enabled, description) values
  ('email_notifications', true, 'Transactional email notifications through Resend.'),
  ('enquiry_attachments', true, 'Private file attachments on enquiry messages.'),
  ('verifier_offline_pwa', true, 'Offline verifier queue and sync support.'),
  ('admin_case_management', true, 'Moderation and protection-sensitive case management.')
on conflict (name) do update
  set enabled = excluded.enabled,
      description = excluded.description,
      updated_at = now();

update feature_flags
set enabled = true,
    updated_at = now()
where name = 'maintenance_marketplace';

grant select, insert, update, delete on provider_team_members to authenticated;
grant select, insert, update on service_provider_profiles to authenticated;
grant select on service_provider_profiles to anon;
grant select, insert, update on maintenance_tickets to authenticated;
grant select, insert, update on maintenance_quotes to authenticated;
grant select, insert, update on maintenance_work_orders to authenticated;
grant select, insert on enquiry_attachments to authenticated;
grant select, insert, update on notification_preferences to authenticated;
grant select on notification_templates to authenticated;
grant select on notification_queue, notification_deliveries to authenticated;
grant select, insert, update on moderation_cases, case_events to authenticated;
grant select on content_pages to anon, authenticated;
grant insert on analytics_events to anon, authenticated;
grant select, insert, update on analytics_events to authenticated;
grant select, update on system_settings to authenticated;
grant select, insert, update on verifier_sync_events to authenticated;

alter table provider_team_members enable row level security;
alter table service_provider_profiles enable row level security;
alter table maintenance_tickets enable row level security;
alter table maintenance_quotes enable row level security;
alter table maintenance_work_orders enable row level security;
alter table enquiry_attachments enable row level security;
alter table notification_preferences enable row level security;
alter table notification_templates enable row level security;
alter table notification_queue enable row level security;
alter table notification_deliveries enable row level security;
alter table moderation_cases enable row level security;
alter table case_events enable row level security;
alter table content_pages enable row level security;
alter table analytics_events enable row level security;
alter table system_settings enable row level security;
alter table verifier_sync_events enable row level security;

create policy "provider team read" on provider_team_members
  for select to authenticated
  using (
    provider_id = (select auth.uid())
    or member_id = (select auth.uid())
    or is_staff()
  );

create policy "provider team manage" on provider_team_members
  for all to authenticated
  using (provider_id = (select auth.uid()) or is_staff())
  with check (provider_id = (select auth.uid()) or is_staff());

create policy "active trades public read" on service_provider_profiles
  for select
  using (
    status = 'active'
    or user_id = (select auth.uid())
    or is_staff()
  );

create policy "own trades profile write" on service_provider_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "own trades profile update" on service_provider_profiles
  for update to authenticated
  using (user_id = (select auth.uid()) or is_staff())
  with check (user_id = (select auth.uid()) or is_staff());

create policy "maintenance ticket read" on maintenance_tickets
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or assigned_service_provider_id = (select auth.uid())
    or is_staff()
    or (
      status in ('open', 'triaged', 'quoted')
      and feature_enabled('maintenance_marketplace')
    )
  );

create policy "maintenance ticket insert" on maintenance_tickets
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and feature_enabled('maintenance_marketplace')
  );

create policy "maintenance ticket update" on maintenance_tickets
  for update to authenticated
  using (
    requester_id = (select auth.uid())
    or assigned_service_provider_id = (select auth.uid())
    or is_staff()
  )
  with check (
    requester_id = (select auth.uid())
    or assigned_service_provider_id = (select auth.uid())
    or is_staff()
  );

create policy "maintenance quote read" on maintenance_quotes
  for select to authenticated
  using (
    service_provider_id = (select auth.uid())
    or is_staff()
    or exists (
      select 1 from maintenance_tickets mt
      where mt.id = maintenance_quotes.ticket_id
        and mt.requester_id = (select auth.uid())
    )
  );

create policy "maintenance quote insert" on maintenance_quotes
  for insert to authenticated
  with check (
    service_provider_id = (select auth.uid())
    and exists (
      select 1 from service_provider_profiles spp
      where spp.user_id = (select auth.uid())
        and spp.status in ('active', 'draft')
    )
  );

create policy "maintenance quote update" on maintenance_quotes
  for update to authenticated
  using (service_provider_id = (select auth.uid()) or is_staff())
  with check (service_provider_id = (select auth.uid()) or is_staff());

create policy "work order read" on maintenance_work_orders
  for select to authenticated
  using (
    service_provider_id = (select auth.uid())
    or is_staff()
    or exists (
      select 1 from maintenance_tickets mt
      where mt.id = maintenance_work_orders.ticket_id
        and mt.requester_id = (select auth.uid())
    )
  );

create policy "work order staff insert" on maintenance_work_orders
  for insert to authenticated
  with check (is_staff());

create policy "work order update" on maintenance_work_orders
  for update to authenticated
  using (service_provider_id = (select auth.uid()) or is_staff())
  with check (service_provider_id = (select auth.uid()) or is_staff());

create policy "enquiry attachment read" on enquiry_attachments
  for select to authenticated
  using (can_access_enquiry(enquiry_id));

create policy "enquiry attachment insert" on enquiry_attachments
  for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and can_access_enquiry(enquiry_id)
  );

create policy "own notification preferences" on notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notification templates read" on notification_templates
  for select to authenticated
  using (true);

create policy "own notification queue read" on notification_queue
  for select to authenticated
  using (recipient_user_id = (select auth.uid()) or has_role('admin'));

create policy "own notification delivery read" on notification_deliveries
  for select to authenticated
  using (
    has_role('admin')
    or exists (
      select 1 from notification_queue nq
      where nq.id = notification_deliveries.queue_id
        and nq.recipient_user_id = (select auth.uid())
    )
  );

create policy "staff cases read" on moderation_cases
  for select to authenticated
  using (
    (not restricted and (has_role('moderator') or has_role('admin')))
    or has_role('admin')
    or assigned_to = (select auth.uid())
  );

create policy "staff cases write" on moderation_cases
  for insert to authenticated
  with check (has_role('moderator') or has_role('admin'));

create policy "staff cases update" on moderation_cases
  for update to authenticated
  using (has_role('moderator') or has_role('admin'))
  with check (has_role('moderator') or has_role('admin'));

create policy "staff case events read" on case_events
  for select to authenticated
  using (
    exists (
      select 1 from moderation_cases mc
      where mc.id = case_events.case_id
        and (
          (not mc.restricted and (has_role('moderator') or has_role('admin')))
          or has_role('admin')
          or mc.assigned_to = (select auth.uid())
        )
    )
  );

create policy "staff case events insert" on case_events
  for insert to authenticated
  with check (has_role('moderator') or has_role('admin'));

create policy "published content read" on content_pages
  for select
  using (status = 'published' or has_role('moderator') or has_role('admin'));

create policy "admin content update" on content_pages
  for all to authenticated
  using (has_role('admin'))
  with check (has_role('admin'));

create policy "analytics insert" on analytics_events
  for insert
  with check (true);

create policy "admin analytics read" on analytics_events
  for select to authenticated
  using (has_role('admin'));

create policy "admin settings read" on system_settings
  for select to authenticated
  using (has_role('admin'));

create policy "admin settings update" on system_settings
  for update to authenticated
  using (has_role('admin'))
  with check (has_role('admin'));

create policy "verifier sync own read" on verifier_sync_events
  for select to authenticated
  using (verifier_id = (select auth.uid()) or is_staff());

create policy "verifier sync insert" on verifier_sync_events
  for insert to authenticated
  with check (
    verifier_id = (select auth.uid())
    and (
      has_role('field_verifier')
      or has_role('moderator')
      or has_role('admin')
    )
  );

create policy "verifier sync staff update" on verifier_sync_events
  for update to authenticated
  using (is_staff())
  with check (is_staff());
