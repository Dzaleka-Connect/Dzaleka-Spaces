-- Phase 2 Payment Ledger.
-- This migration adds non-custodial double-confirmation payment ledger tables:
-- charges, payment_records, payment_allocations.

create type payment_method as enum (
  'cash', 'airtel_money', 'tnm_mpamba', 'dzalekapay', 'bank_transfer', 'organisation', 'other'
);

create type payment_status as enum (
  'pending_confirmation', 'confirmed', 'disputed', 'rejected'
);

create type charge_status as enum (
  'unpaid', 'partially_paid', 'paid', 'void'
);

create table charges (
  id uuid primary key default gen_random_uuid(),
  occupancy_id uuid not null references occupancies (id) on delete cascade,
  amount_mwk int not null check (amount_mwk > 0),
  due_date date not null,
  status charge_status not null default 'unpaid',
  description text,
  created_at timestamptz not null default now()
);

create table payment_records (
  id uuid primary key default gen_random_uuid(),
  occupancy_id uuid not null references occupancies (id) on delete cascade,
  payer_id uuid references profiles (id) on delete set null,
  amount_mwk int not null check (amount_mwk > 0),
  payment_date date not null,
  method payment_method not null,
  external_reference text check (external_reference is null or char_length(external_reference) between 1 and 100),
  provider_confirmed_at timestamptz,
  payer_confirmed_at timestamptz,
  status payment_status not null default 'pending_confirmation',
  notes text,
  created_at timestamptz not null default now()
);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payment_records (id) on delete cascade,
  charge_id uuid not null references charges (id) on delete cascade,
  amount_mwk int not null check (amount_mwk > 0),
  created_at timestamptz not null default now(),
  constraint unique_payment_charge_allocation unique(payment_id, charge_id)
);

create index charges_occupancy_idx on charges (occupancy_id, due_date);
create index payment_records_occupancy_idx on payment_records (occupancy_id, payment_date);
create index payment_allocations_payment_idx on payment_allocations (payment_id);
create index payment_allocations_charge_idx on payment_allocations (charge_id);

-- Enforce "Unique external payment references per provider"
create or replace function check_unique_external_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_uuid uuid;
begin
  if new.external_reference is null or new.external_reference = '' then
    return new;
  end if;

  -- Get provider of new payment record
  select provider_id into provider_uuid
  from occupancies
  where id = new.occupancy_id;

  if exists (
    select 1
    from payment_records pr
    join occupancies o on o.id = pr.occupancy_id
    where pr.external_reference = new.external_reference
      and o.provider_id = provider_uuid
      and pr.id <> new.id
  ) then
    raise exception 'Duplicate external reference % for this provider', new.external_reference;
  end if;

  return new;
end;
$$;

create trigger payment_records_unique_ext_ref
  before insert or update of external_reference
  on payment_records
  for each row
  execute function check_unique_external_reference();

-- Auto-update charge status function
create or replace function recalculate_charge_status(cid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tot_allocated int;
  charge_amt int;
  c_status charge_status;
begin
  select amount_mwk, status into charge_amt, c_status from charges where id = cid;
  if c_status = 'void'::charge_status then
    return;
  end if;
  
  select coalesce(sum(amount_mwk), 0) into tot_allocated
  from payment_allocations
  where charge_id = cid;

  update charges
  set status = case
    when tot_allocated >= charge_amt then 'paid'::charge_status
    when tot_allocated > 0 then 'partially_paid'::charge_status
    else 'unpaid'::charge_status
  end
  where id = cid;
end;
$$;

-- Trigger to recalculate charge status on allocation change
create or replace function handle_payment_allocation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    perform recalculate_charge_status(new.charge_id);
  end if;
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    perform recalculate_charge_status(old.charge_id);
  end if;
  return null;
end;
$$;

create trigger payment_allocation_recalc
  after insert or update or delete
  on payment_allocations
  for each row
  execute function handle_payment_allocation_change();

-- RLS & Grants
grant select, insert, update on charges to authenticated;
grant select, insert, update on payment_records to authenticated;
grant select, insert, update on payment_allocations to authenticated;

alter table charges enable row level security;
alter table payment_records enable row level security;
alter table payment_allocations enable row level security;

-- RLS Policies: Charges
create policy "charges read" on charges
  for select to authenticated
  using (
    is_occupancy_party(occupancy_id)
    or is_occupancy_provider(occupancy_id)
    or is_staff()
    or has_role('finance')
  );

create policy "provider inserts charges" on charges
  for insert to authenticated
  with check (
    is_occupancy_provider(occupancy_id)
    or is_staff()
  );

create policy "provider updates charges" on charges
  for update to authenticated
  using (
    is_occupancy_provider(occupancy_id)
    or is_staff()
    or has_role('finance')
  )
  with check (
    is_occupancy_provider(occupancy_id)
    or is_staff()
    or has_role('finance')
  );

-- RLS Policies: Payment Records
create policy "payments read" on payment_records
  for select to authenticated
  using (
    is_occupancy_party(occupancy_id)
    or is_occupancy_provider(occupancy_id)
    or is_staff()
    or has_role('finance')
  );

create policy "payments insert" on payment_records
  for insert to authenticated
  with check (
    is_occupancy_party(occupancy_id)
    or is_occupancy_provider(occupancy_id)
    or is_staff()
  );

create policy "payments update" on payment_records
  for update to authenticated
  using (
    is_occupancy_party(occupancy_id)
    or is_occupancy_provider(occupancy_id)
    or is_staff()
    or has_role('finance')
  )
  with check (
    is_occupancy_party(occupancy_id)
    or is_occupancy_provider(occupancy_id)
    or is_staff()
    or has_role('finance')
  );

-- RLS Policies: Allocations
create policy "allocations read" on payment_allocations
  for select to authenticated
  using (
    exists (
      select 1 from payment_records pr
      where pr.id = payment_id
        and (
          is_occupancy_party(pr.occupancy_id)
          or is_occupancy_provider(pr.occupancy_id)
          or is_staff()
          or has_role('finance')
        )
    )
  );

create policy "allocations insert" on payment_allocations
  for insert to authenticated
  with check (
    exists (
      select 1 from payment_records pr
      where pr.id = payment_id
        and (
          is_occupancy_provider(pr.occupancy_id)
          or is_staff()
        )
    )
  );

create policy "allocations update" on payment_allocations
  for update to authenticated
  using (
    exists (
      select 1 from payment_records pr
      where pr.id = payment_id
        and (
          is_occupancy_provider(pr.occupancy_id)
          or is_staff()
          or has_role('finance')
        )
    )
  )
  with check (
    exists (
      select 1 from payment_records pr
      where pr.id = payment_id
        and (
          is_occupancy_provider(pr.occupancy_id)
          or is_staff()
          or has_role('finance')
        )
    )
  );
