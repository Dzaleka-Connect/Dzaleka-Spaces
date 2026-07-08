-- Phase 2: occupancy records. An occupancy documents an arrangement between
-- a provider and an occupant. It never claims to create property ownership,
-- and the pilot records no money — charges/payments arrive in a later phase.

create type occupancy_status as enum (
  'awaiting_occupant_confirmation',
  'active',
  'notice_given',
  'completed',
  'cancelled',
  'disputed'
);

create table occupancies (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces (id) on delete cascade,
  listing_id uuid references listings (id) on delete set null,
  provider_id uuid not null references profiles (id) on delete cascade,
  status occupancy_status not null default 'awaiting_occupant_confirmation',
  start_date date not null,
  expected_end_date date,
  billing_period billing_period not null default 'monthly',
  agreed_amount_mwk int not null check (agreed_amount_mwk >= 0),
  deposit_amount_mwk int check (deposit_amount_mwk >= 0),
  payment_due_day smallint check (payment_due_day between 1 and 28),
  notice_period_days int check (notice_period_days >= 0),
  included_services text,
  notes text,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  closed_at timestamptz,
  constraint occupancy_dates_check
    check (expected_end_date is null or expected_end_date > start_date)
);

create index occupancies_space_idx on occupancies (space_id, status);
create index occupancies_provider_idx on occupancies (provider_id, status);

-- A space holds at most one live occupancy at a time.
create unique index one_live_occupancy_per_space
  on occupancies (space_id)
  where (status in ('active', 'notice_given'));

create table occupancy_parties (
  id uuid primary key default gen_random_uuid(),
  occupancy_id uuid not null references occupancies (id) on delete cascade,
  user_id uuid references profiles (id) on delete set null,
  role text not null check (role in ('provider', 'occupant')),
  full_name text not null,
  contact text,
  confirmed_at timestamptz,
  confirmation_method text
    check (confirmation_method in ('in_app', 'in_person', 'staff_assisted')),
  created_at timestamptz not null default now()
);

create index occupancy_parties_occupancy_idx
  on occupancy_parties (occupancy_id);
create index occupancy_parties_user_idx on occupancy_parties (user_id);

-- ---------------------------------------------------------------------------
-- RLS helpers. SECURITY DEFINER breaks the occupancies<->occupancy_parties
-- policy reference cycle; each reveals only a boolean about the caller.
-- ---------------------------------------------------------------------------

create or replace function is_occupancy_party(oid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from occupancy_parties
    where occupancy_id = oid and user_id = (select auth.uid())
  );
$$;

create or replace function is_occupancy_provider(oid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from occupancies
    where id = oid and provider_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Feature flag: on by default (commercial pilot Phase 2); admins may disable.
-- ---------------------------------------------------------------------------

insert into feature_flags (name, enabled, description) values
  ('occupancy_records', true,
   'Phase 2 occupancy records: documented arrangements with both-party confirmation. No money is recorded until the payment ledger ships.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

grant select, insert, update on occupancies to authenticated;
grant select, insert, update on occupancy_parties to authenticated;

alter table occupancies enable row level security;
alter table occupancy_parties enable row level security;

create policy "occupancy read" on occupancies
  for select to authenticated
  using (
    provider_id = (select auth.uid())
    or is_occupancy_party(id)
    or is_staff()
  );

create policy "provider creates occupancy" on occupancies
  for insert to authenticated
  with check (
    provider_id = (select auth.uid())
    and owns_space(space_id)
    and feature_enabled('occupancy_records')
  );

create policy "occupancy update" on occupancies
  for update to authenticated
  using (
    provider_id = (select auth.uid())
    or is_occupancy_party(id)
    or is_staff()
  )
  with check (
    provider_id = (select auth.uid())
    or is_occupancy_party(id)
    or is_staff()
  );

create policy "occupancy party read" on occupancy_parties
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_occupancy_provider(occupancy_id)
    or is_staff()
  );

create policy "occupancy party insert" on occupancy_parties
  for insert to authenticated
  with check (
    is_occupancy_provider(occupancy_id) or is_staff()
  );

create policy "occupancy party update" on occupancy_parties
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or is_occupancy_provider(occupancy_id)
    or is_staff()
  )
  with check (
    user_id = (select auth.uid())
    or is_occupancy_provider(occupancy_id)
    or is_staff()
  );

-- Participants (not just staff) may write their own audit trail rows.
create policy "authenticated audit insert" on audit_events
  for insert to authenticated
  with check (actor_id = (select auth.uid()));
