-- Maintenance marketplace depth: job messages, reviews, and private documents.
-- Exact household coordinates and identity documents stay out of these tables.

-- ---------------------------------------------------------------------------
-- Helpers for ticket participation (SECURITY DEFINER to avoid RLS recursion).
-- ---------------------------------------------------------------------------

create or replace function public.maintenance_ticket_participant(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from maintenance_tickets mt
    where mt.id = p_ticket_id
      and (
        mt.requester_id = (select auth.uid())
        or mt.assigned_service_provider_id = (select auth.uid())
        or is_staff()
      )
  );
$$;

create or replace function public.maintenance_work_order_participant(p_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from maintenance_work_orders wo
    join maintenance_tickets mt on mt.id = wo.ticket_id
    where wo.id = p_work_order_id
      and (
        wo.service_provider_id = (select auth.uid())
        or mt.requester_id = (select auth.uid())
        or is_staff()
      )
  );
$$;

revoke all on function public.maintenance_ticket_participant(uuid) from public;
grant execute on function public.maintenance_ticket_participant(uuid) to authenticated;

revoke all on function public.maintenance_work_order_participant(uuid) from public;
grant execute on function public.maintenance_work_order_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Messages attached to maintenance tickets.
-- ---------------------------------------------------------------------------

create table maintenance_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references maintenance_tickets (id) on delete cascade,
  work_order_id uuid references maintenance_work_orders (id) on delete set null,
  sender_id uuid not null references profiles (id) on delete cascade,
  sender_role text not null
    check (sender_role in ('requester', 'service_provider', 'staff')),
  body text not null,
  created_at timestamptz not null default now()
);

create index maintenance_messages_ticket_idx
  on maintenance_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Reviews after completed work orders (one review per work order).
-- ---------------------------------------------------------------------------

create table maintenance_reviews (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null unique references maintenance_work_orders (id) on delete cascade,
  ticket_id uuid not null references maintenance_tickets (id) on delete cascade,
  reviewer_id uuid not null references profiles (id) on delete cascade,
  service_provider_id uuid not null references profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index maintenance_reviews_provider_idx
  on maintenance_reviews (service_provider_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Private documents / evidence for tickets and work orders.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'maintenance-private',
    'maintenance-private',
    false,
    10485760,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain'
    ]
  )
on conflict (id) do nothing;

create table maintenance_documents (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references maintenance_tickets (id) on delete cascade,
  work_order_id uuid references maintenance_work_orders (id) on delete set null,
  uploader_id uuid not null references profiles (id) on delete cascade,
  kind text not null default 'evidence'
    check (kind in ('evidence', 'quote', 'completion', 'other')),
  file_name text not null,
  content_type text,
  byte_size int,
  bucket text not null default 'maintenance-private',
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index maintenance_documents_ticket_idx
  on maintenance_documents (ticket_id, created_at desc);
create index maintenance_documents_work_order_idx
  on maintenance_documents (work_order_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------------

grant select, insert on maintenance_messages to authenticated;
grant select, insert on maintenance_reviews to authenticated;
grant select, insert on maintenance_documents to authenticated;

alter table maintenance_messages enable row level security;
alter table maintenance_reviews enable row level security;
alter table maintenance_documents enable row level security;

create policy "maintenance message read" on maintenance_messages
  for select to authenticated
  using (maintenance_ticket_participant(ticket_id));

create policy "maintenance message insert" on maintenance_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and maintenance_ticket_participant(ticket_id)
    and (
      (sender_role = 'staff' and is_staff())
      or (
        sender_role = 'requester'
        and exists (
          select 1 from maintenance_tickets mt
          where mt.id = ticket_id
            and mt.requester_id = (select auth.uid())
        )
      )
      or (
        sender_role = 'service_provider'
        and exists (
          select 1 from maintenance_tickets mt
          where mt.id = ticket_id
            and mt.assigned_service_provider_id = (select auth.uid())
        )
      )
    )
  );

create policy "maintenance review read" on maintenance_reviews
  for select to authenticated
  using (
    reviewer_id = (select auth.uid())
    or service_provider_id = (select auth.uid())
    or is_staff()
    or maintenance_ticket_participant(ticket_id)
  );

create policy "maintenance review insert" on maintenance_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1
      from maintenance_work_orders wo
      join maintenance_tickets mt on mt.id = wo.ticket_id
      where wo.id = work_order_id
        and wo.ticket_id = ticket_id
        and wo.service_provider_id = service_provider_id
        and wo.status = 'completed'
        and mt.requester_id = (select auth.uid())
    )
  );

create policy "maintenance document read" on maintenance_documents
  for select to authenticated
  using (maintenance_ticket_participant(ticket_id));

create policy "maintenance document insert" on maintenance_documents
  for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and maintenance_ticket_participant(ticket_id)
  );

-- Storage: path convention ticket_id/uploader_id/filename
create or replace function storage_ticket_id_from_path(path text)
returns uuid
language sql immutable set search_path = public as $$
  select nullif(split_part(path, '/', 1), '')::uuid;
$$;

create or replace function storage_uploader_id_from_path(path text)
returns uuid
language sql immutable set search_path = public as $$
  select nullif(split_part(path, '/', 2), '')::uuid;
$$;

revoke execute on function storage_ticket_id_from_path(text)
  from public, anon, authenticated;
revoke execute on function storage_uploader_id_from_path(text)
  from public, anon, authenticated;

create policy "maintenance private read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'maintenance-private'
    and (
      is_staff()
      or maintenance_ticket_participant(storage_ticket_id_from_path(name))
    )
  );

create policy "maintenance private insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'maintenance-private'
    and storage_uploader_id_from_path(name) = (select auth.uid())
    and maintenance_ticket_participant(storage_ticket_id_from_path(name))
  );
