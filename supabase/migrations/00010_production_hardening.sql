-- Production hardening: authorization, immutable ledger operations, receipts,
-- operational records, upload quarantine, and complete provider-team scopes.
--
-- Dzaleka Spaces records occupancy and payments but never holds funds. Nothing
-- in this migration represents land ownership or legal title.

alter type listing_status add value if not exists 'automated_review';
alter type listing_status add value if not exists 'authority_review';
alter type listing_status add value if not exists 'verification_pending';
alter type listing_status add value if not exists 'verification_scheduled';
alter type listing_status add value if not exists 'verification_completed';
alter type listing_status add value if not exists 'supervisor_review';
alter type listing_status add value if not exists 'stale';
alter type listing_status add value if not exists 'suspended';

create or replace function enforce_listing_workflow()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  reviewer boolean := has_role('moderator') or has_role('admin');
  allowed boolean := false;
begin
  if old.status is not distinct from new.status or (select auth.uid()) is null then
    return new;
  end if;

  if reviewer then
    allowed :=
      new.status in ('changes_requested', 'rejected', 'suspended', 'archived')
      or (old.status in ('pending_review', 'submitted', 'changes_requested')
          and new.status in ('under_review', 'authority_review', 'verification_pending'))
      or (old.status in ('under_review', 'authority_review')
          and new.status in ('verification_pending', 'changes_requested'))
      or (old.status = 'verification_pending' and new.status = 'verification_scheduled')
      or (old.status = 'verification_scheduled' and new.status = 'verification_completed')
      or (old.status = 'verification_completed' and new.status = 'supervisor_review')
      or (old.status in ('pending_review', 'submitted', 'under_review', 'supervisor_review')
          and new.status = 'approved')
      or (old.status = 'approved' and new.status = 'published')
      or (old.status in ('paused', 'stale') and new.status = 'published')
      or (old.status = 'published' and new.status in ('paused', 'matched', 'stale', 'expired'));
  elsif owns_space(new.space_id) then
    allowed :=
      (old.status in ('draft', 'pending_review', 'changes_requested') and new.status = 'submitted')
      or (old.status = 'published' and new.status in ('paused', 'matched', 'archived'))
      or (old.status = 'paused' and new.status in ('submitted', 'archived'));
  elsif has_role('field_verifier')
        and old.status = 'verification_scheduled'
        and new.status = 'verification_completed' then
    allowed := exists (
      select 1 from verification_assignments va
      where va.listing_id = new.id
        and va.verifier_id = (select auth.uid())
        and va.status = 'submitted'
    );
  end if;

  if not allowed then
    raise exception 'Listing transition from % to % is not allowed', old.status, new.status;
  end if;
  return new;
end;
$$;

revoke all on function enforce_listing_workflow() from public, anon, authenticated;
drop trigger if exists listing_workflow_guard on listings;
create trigger listing_workflow_guard
  before update of status on listings
  for each row execute function enforce_listing_workflow();

create or replace function enforce_listing_publication()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  space_rec record;
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if (select auth.uid()) is not null
       and not (has_role('moderator') or has_role('admin')) then
      raise exception 'Only a moderator or admin can publish a listing';
    end if;
    select s.category, s.zone_id into space_rec from spaces s where s.id = new.space_id;
    if space_rec.zone_id is null then raise exception 'Listing cannot be published without a zone'; end if;
    if space_rec.category::text in ('room', 'shared_room')
       and not feature_enabled('residential_listings') then
      raise exception 'Residential listings are not yet enabled';
    end if;
    if space_rec.category::text = 'family_accommodation'
       and not feature_enabled('family_accommodation') then
      raise exception 'Family accommodation listings are not yet enabled';
    end if;
    if not exists (
      select 1 from space_internal si where si.space_id = new.space_id
        and si.authority_basis is not null
    ) then
      raise exception 'Listing cannot be published without an authority-to-offer record';
    end if;
    if not exists (
      select 1 from verifications v where v.listing_id = new.id
        and v.status = 'approved' and v.verified_at is not null
    ) then
      raise exception 'Listing cannot be published without approved verification';
    end if;
    if not exists (
      select 1 from space_media sm where sm.space_id = new.space_id
        and sm.is_public = true and sm.bucket = 'listing-public'
    ) then
      raise exception 'Listing cannot be published without approved public media';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

revoke all on function enforce_listing_publication() from public, anon, authenticated;

create or replace function search_public_listings(
  p_query text default null,
  p_zone text default null,
  p_category text default null,
  p_min_price int default null,
  p_max_price int default null,
  p_billing_period text default null,
  p_available_by date default null,
  p_min_rooms int default null,
  p_facilities text[] default '{}',
  p_verified boolean default null,
  p_recent_verified_days int default null,
  p_sort text default 'relevance',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  category space_category,
  zone text,
  landmark text,
  description text,
  rooms int,
  capacity int,
  facilities text[],
  price_mwk int,
  deposit_mwk int,
  billing_period billing_period,
  available_from date,
  verified boolean,
  verified_at timestamptz,
  featured boolean,
  provider_name text,
  whatsapp text,
  created_at timestamptz,
  cover_image_path text,
  cover_image_bucket text,
  total_count bigint
)
language sql stable security invoker set search_path = public, extensions as $$
  select
    pl.*,
    count(*) over() as total_count
  from public_listings pl
  where
    (nullif(trim(p_query), '') is null or (
      pl.title ilike '%' || trim(p_query) || '%'
      or pl.description ilike '%' || trim(p_query) || '%'
      or pl.landmark ilike '%' || trim(p_query) || '%'
      or pl.zone ilike '%' || trim(p_query) || '%'
      or similarity(pl.title, trim(p_query)) > 0.2
      or similarity(pl.landmark, trim(p_query)) > 0.2
    ))
    and (p_zone is null or pl.zone = p_zone)
    and (p_category is null or pl.category::text = p_category)
    and (p_min_price is null or pl.price_mwk >= p_min_price)
    and (p_max_price is null or pl.price_mwk <= p_max_price)
    and (p_billing_period is null or pl.billing_period::text = p_billing_period)
    and (p_available_by is null or pl.available_from is null or pl.available_from <= p_available_by)
    and (p_min_rooms is null or coalesce(pl.rooms, 0) >= p_min_rooms)
    and (coalesce(array_length(p_facilities, 1), 0) = 0 or p_facilities <@ pl.facilities)
    and (p_verified is null or pl.verified = p_verified)
    and (
      p_recent_verified_days is null
      or pl.verified_at >= now() - make_interval(days => greatest(1, least(p_recent_verified_days, 365)))
    )
  order by
    case when p_sort = 'price_asc' then pl.price_mwk end asc,
    case when p_sort = 'price_desc' then pl.price_mwk end desc,
    case when p_sort = 'verified_recent' then pl.verified_at end desc nulls last,
    case when p_sort = 'available_soon' then pl.available_from end asc nulls first,
    case when p_sort = 'recent' then pl.created_at end desc,
    case when p_sort = 'relevance' and nullif(trim(p_query), '') is not null
      then greatest(similarity(pl.title, trim(p_query)), similarity(pl.landmark, trim(p_query)))
    end desc nulls last,
    pl.featured desc,
    pl.created_at desc
  limit greatest(1, least(p_limit, 48))
  offset greatest(0, p_offset);
$$;

revoke all on function search_public_listings(text, text, text, int, int, text, date, int, text[], boolean, int, text, int, int) from public;
grant execute on function search_public_listings(text, text, text, int, int, text, date, int, text[], boolean, int, text, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Account security and staff MFA enforcement.
-- ---------------------------------------------------------------------------

alter table profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'restricted', 'suspended', 'closed')),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists user_security_settings (
  user_id uuid primary key references profiles (id) on delete cascade,
  inactivity_timeout_minutes int not null default 30
    check (inactivity_timeout_minutes between 5 and 1440),
  notify_on_new_sign_in boolean not null default true,
  notify_on_security_change boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete restrict,
  request_type text not null
    check (request_type in ('access', 'correction', 'export', 'deletion', 'restriction')),
  details text,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'completed', 'declined')),
  handled_by uuid references profiles (id) on delete set null,
  resolution text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on user_security_settings to authenticated;
grant select, insert, update on privacy_requests to authenticated;
alter table user_security_settings enable row level security;
alter table privacy_requests enable row level security;

create policy "own security settings" on user_security_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own privacy requests read" on privacy_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or has_role('admin'));
create policy "own privacy requests create" on privacy_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "admin handles privacy requests" on privacy_requests
  for update to authenticated
  using (has_role('admin')) with check (has_role('admin'));

create or replace function staff_mfa_satisfied()
returns boolean
language sql stable security definer set search_path = public as $$
  select not is_staff()
    or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

revoke all on function staff_mfa_satisfied() from public, anon;
grant execute on function staff_mfa_satisfied() to authenticated;

-- These records are operationally sensitive. Restrictive policies combine
-- with their existing domain policies and require AAL2 for staff access.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'space_internal', 'verifications', 'user_roles', 'feature_flags',
    'audit_events', 'moderation_cases', 'case_events', 'system_settings',
    'notification_templates', 'notification_queue',
    'notification_deliveries', 'verifier_sync_events', 'charges',
    'payment_records', 'payment_allocations'
  ] loop
    if to_regclass('public.' || target_table) is not null then
      execute format(
        'create policy %I on %I as restrictive for all to authenticated using (staff_mfa_satisfied()) with check (staff_mfa_satisfied())',
        'staff mfa required ' || target_table,
        target_table
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Complete feature-flag catalogue. Custody and residential flags stay off.
-- ---------------------------------------------------------------------------

insert into feature_flags (name, enabled, description) values
  ('payment_processing', false, 'External fund processing. Disabled for the non-custodial pilot.'),
  ('mobile_money_integrations', false, 'Provider API integrations only. Ledger references remain available.'),
  ('deposit_custody', false, 'Holding deposits is prohibited during the pilot.'),
  ('sms_notifications', false, 'Outbound SMS adapter. Not configured for the pilot.'),
  ('web_push_notifications', false, 'Web push adapter. Not configured for the pilot.'),
  ('public_service_reviews', true, 'Publish moderated service-provider reviews.'),
  ('email_notifications', true, 'Transactional email through the configured Resend adapter.'),
  ('enquiry_attachments', true, 'Private attachments in enquiry threads.'),
  ('verifier_offline_pwa', true, 'Offline verifier assignment and evidence queue.'),
  ('admin_case_management', true, 'Moderation and protection-sensitive case operations.')
on conflict (name) do update
set description = excluded.description;

-- No application role may enable prohibited custody or residential functions.
create or replace function enforce_protected_feature_flags()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.enabled and new.name in (
    'payment_processing', 'deposit_custody', 'deposit_processing',
    'residential_listings', 'family_accommodation'
  ) then
    raise exception 'Feature % requires an external operational approval and cannot be enabled in-app', new.name;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function enforce_protected_feature_flags() from public, anon, authenticated;

drop trigger if exists protected_feature_flags_guard on feature_flags;
create trigger protected_feature_flags_guard
  before insert or update on feature_flags
  for each row execute function enforce_protected_feature_flags();

-- ---------------------------------------------------------------------------
-- Provider team: permission-specific helpers and policies.
-- ---------------------------------------------------------------------------

create or replace function provider_can_manage_occupancy(
  occupancy uuid,
  permission text
)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from occupancies o
    where o.id = occupancy
      and (
        o.provider_id = (select auth.uid())
        or provider_team_has(o.provider_id, permission)
      )
  );
$$;

revoke all on function provider_can_manage_occupancy(uuid, text) from public, anon;
grant execute on function provider_can_manage_occupancy(uuid, text) to authenticated;

drop policy if exists "occupancy read" on occupancies;
create policy "occupancy read" on occupancies
  for select to authenticated
  using (
    provider_id = (select auth.uid())
    or provider_team_has(provider_id, 'manage_occupancies')
    or is_occupancy_party(id)
    or is_staff()
  );

drop policy if exists "provider creates occupancy" on occupancies;
create policy "provider creates occupancy" on occupancies
  for insert to authenticated
  with check (
    (
      provider_id = (select auth.uid())
      or provider_team_has(provider_id, 'manage_occupancies')
    )
    and owns_space(space_id)
    and feature_enabled('occupancy_records')
  );

drop policy if exists "occupancy update" on occupancies;
create policy "occupancy update" on occupancies
  for update to authenticated
  using (
    provider_id = (select auth.uid())
    or provider_team_has(provider_id, 'manage_occupancies')
    or is_occupancy_party(id)
    or is_staff()
  )
  with check (
    provider_id = (select auth.uid())
    or provider_team_has(provider_id, 'manage_occupancies')
    or is_occupancy_party(id)
    or is_staff()
  );

drop policy if exists "provider team manage" on provider_team_members;
create policy "provider team manage" on provider_team_members
  for all to authenticated
  using (
    provider_id = (select auth.uid())
    or provider_team_has(provider_id, 'full_manager')
    or is_staff()
  )
  with check (
    provider_id = (select auth.uid())
    or provider_team_has(provider_id, 'full_manager')
    or is_staff()
  );

-- ---------------------------------------------------------------------------
-- Append-only payment ledger, dual confirmation, receipts and disputes.
-- ---------------------------------------------------------------------------

alter table charges
  add column if not exists created_by uuid references profiles (id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text;

alter table payment_records
  add column if not exists created_by uuid references profiles (id) on delete set null,
  add column if not exists idempotency_key uuid,
  add column if not exists confirmed_at timestamptz,
  add column if not exists dispute_reason text;

create unique index if not exists payment_records_idempotency_idx
  on payment_records (created_by, idempotency_key)
  where idempotency_key is not null;

create table if not exists payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references payment_records (id) on delete restrict,
  receipt_number text not null unique,
  verification_code text not null unique,
  issued_at timestamptz not null default now()
);

create table if not exists payment_disputes (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payment_records (id) on delete restrict,
  opened_by uuid not null references profiles (id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 10 and 2000),
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  resolution text,
  resolved_by uuid references profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists payment_adjustments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payment_records (id) on delete restrict,
  amount_delta_mwk int not null check (amount_delta_mwk <> 0),
  reason text not null check (char_length(trim(reason)) between 10 and 2000),
  created_by uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists payment_disputes_payment_idx
  on payment_disputes (payment_id, status, created_at desc);
create index if not exists payment_adjustments_payment_idx
  on payment_adjustments (payment_id, created_at desc);

grant select on payment_receipts, payment_disputes, payment_adjustments to authenticated;
alter table payment_receipts enable row level security;
alter table payment_disputes enable row level security;
alter table payment_adjustments enable row level security;

create policy "receipt parties read" on payment_receipts
  for select to authenticated
  using (
    exists (
      select 1 from payment_records pr
      where pr.id = payment_receipts.payment_id
        and (
          is_occupancy_party(pr.occupancy_id)
          or provider_can_manage_occupancy(pr.occupancy_id, 'record_payments')
          or has_role('finance')
          or is_staff()
        )
    )
  );

create policy "payment dispute parties read" on payment_disputes
  for select to authenticated
  using (
    opened_by = (select auth.uid())
    or exists (
      select 1 from payment_records pr
      where pr.id = payment_disputes.payment_id
        and (
          is_occupancy_party(pr.occupancy_id)
          or provider_can_manage_occupancy(pr.occupancy_id, 'record_payments')
          or has_role('finance')
          or is_staff()
        )
    )
  );

create policy "payment adjustment parties read" on payment_adjustments
  for select to authenticated
  using (
    exists (
      select 1 from payment_records pr
      where pr.id = payment_adjustments.payment_id
        and (
          is_occupancy_party(pr.occupancy_id)
          or provider_can_manage_occupancy(pr.occupancy_id, 'record_payments')
          or has_role('finance')
          or is_staff()
        )
    )
  );

create policy "staff mfa required payment receipts" on payment_receipts
  as restrictive for all to authenticated
  using (staff_mfa_satisfied()) with check (staff_mfa_satisfied());
create policy "staff mfa required payment disputes" on payment_disputes
  as restrictive for all to authenticated
  using (staff_mfa_satisfied()) with check (staff_mfa_satisfied());
create policy "staff mfa required payment adjustments" on payment_adjustments
  as restrictive for all to authenticated
  using (staff_mfa_satisfied()) with check (staff_mfa_satisfied());

-- Confirmed records and all generated allocations/receipts are append-only.
create or replace function protect_financial_history()
returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Financial history is append-only';
  end if;
  if tg_table_name = 'payment_records' and old.status = 'confirmed' then
    if new.amount_mwk <> old.amount_mwk
      or new.payment_date <> old.payment_date
      or new.method <> old.method
      or new.external_reference is distinct from old.external_reference
      or new.occupancy_id <> old.occupancy_id then
      raise exception 'Confirmed payment values cannot be changed; create an adjustment';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function protect_financial_history() from public, anon, authenticated;

drop trigger if exists protect_payment_history on payment_records;
create trigger protect_payment_history
  before update or delete on payment_records
  for each row execute function protect_financial_history();
drop trigger if exists protect_allocation_history on payment_allocations;
create trigger protect_allocation_history
  before delete on payment_allocations
  for each row execute function protect_financial_history();
drop trigger if exists protect_receipt_history on payment_receipts;
create trigger protect_receipt_history
  before update or delete on payment_receipts
  for each row execute function protect_financial_history();
drop trigger if exists protect_adjustment_history on payment_adjustments;
create trigger protect_adjustment_history
  before update or delete on payment_adjustments
  for each row execute function protect_financial_history();

create or replace function ledger_auto_allocate(payment uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  payment_row payment_records%rowtype;
  charge_row record;
  remaining int;
  outstanding int;
  allocation int;
begin
  select * into payment_row from payment_records where id = payment for update;
  if payment_row.status <> 'confirmed' then return; end if;

  select payment_row.amount_mwk - coalesce(sum(pa.amount_mwk), 0)
  into remaining
  from payment_allocations pa
  where pa.payment_id = payment;

  for charge_row in
    select c.id, c.amount_mwk,
      c.amount_mwk - coalesce(sum(pa.amount_mwk), 0) as outstanding
    from charges c
    left join payment_allocations pa on pa.charge_id = c.id
    where c.occupancy_id = payment_row.occupancy_id
      and c.status in ('unpaid', 'partially_paid')
    group by c.id
    order by c.due_date, c.created_at
  loop
    exit when remaining <= 0;
    outstanding := greatest(charge_row.outstanding, 0);
    allocation := least(remaining, outstanding);
    if allocation > 0 then
      insert into payment_allocations (payment_id, charge_id, amount_mwk)
      values (payment, charge_row.id, allocation)
      on conflict (payment_id, charge_id) do nothing;
      remaining := remaining - allocation;
    end if;
  end loop;
end;
$$;

revoke all on function ledger_auto_allocate(uuid) from public, anon, authenticated;

create or replace function ledger_create_charge(
  occupancy uuid,
  amount_mwk int,
  due_on date,
  charge_description text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  charge_id uuid;
begin
  if amount_mwk <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if not provider_can_manage_occupancy(occupancy, 'record_payments')
     and not is_staff() then
    raise exception 'Not authorised to create this charge';
  end if;

  insert into charges (
    occupancy_id, amount_mwk, due_date, description, created_by
  ) values (
    occupancy, amount_mwk, due_on, nullif(trim(charge_description), ''), (select auth.uid())
  ) returning id into charge_id;

  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values ((select auth.uid()), 'charge.created', 'charge', charge_id::text,
    jsonb_build_object('occupancy_id', occupancy, 'amount_mwk', amount_mwk, 'due_date', due_on));
  return charge_id;
end;
$$;

create or replace function ledger_record_payment(
  occupancy uuid,
  amount_mwk int,
  paid_on date,
  payment_method payment_method,
  external_reference text default null,
  payment_notes text default null,
  idempotency uuid default gen_random_uuid()
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  payment_id uuid;
  caller uuid := (select auth.uid());
  caller_is_provider boolean;
  caller_is_occupant boolean;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if amount_mwk <= 0 then raise exception 'Amount must be greater than zero'; end if;

  caller_is_provider := provider_can_manage_occupancy(occupancy, 'record_payments');
  select exists (
    select 1 from occupancy_parties op
    where op.occupancy_id = occupancy
      and op.user_id = caller and op.role = 'occupant'
  ) into caller_is_occupant;

  if not caller_is_provider and not caller_is_occupant and not is_staff() then
    raise exception 'Not authorised to record this payment';
  end if;

  select id into payment_id from payment_records
  where created_by = caller and idempotency_key = idempotency;
  if payment_id is not null then return payment_id; end if;

  insert into payment_records (
    occupancy_id, payer_id, amount_mwk, payment_date, method,
    external_reference, notes, status, provider_confirmed_at,
    payer_confirmed_at, created_by, idempotency_key
  ) values (
    occupancy,
    case when caller_is_occupant then caller else null end,
    amount_mwk,
    paid_on,
    payment_method,
    nullif(trim(external_reference), ''),
    nullif(trim(payment_notes), ''),
    'pending_confirmation',
    case when caller_is_provider then now() else null end,
    case when caller_is_occupant then now() else null end,
    caller,
    idempotency
  ) returning id into payment_id;

  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values (caller, 'payment.recorded', 'payment', payment_id::text,
    jsonb_build_object('occupancy_id', occupancy, 'amount_mwk', amount_mwk, 'method', payment_method));
  return payment_id;
end;
$$;

create or replace function ledger_confirm_payment(payment uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  row payment_records%rowtype;
  caller uuid := (select auth.uid());
  caller_is_provider boolean;
  caller_is_occupant boolean;
  new_status text;
begin
  select * into row from payment_records where id = payment for update;
  if not found then raise exception 'Payment not found'; end if;
  if row.status not in ('pending_confirmation', 'confirmed') then
    raise exception 'Payment cannot be confirmed from status %', row.status;
  end if;

  caller_is_provider := provider_can_manage_occupancy(row.occupancy_id, 'record_payments');
  select exists (
    select 1 from occupancy_parties op
    where op.occupancy_id = row.occupancy_id
      and op.user_id = caller and op.role = 'occupant'
  ) into caller_is_occupant;
  if not caller_is_provider and not caller_is_occupant and not is_staff() then
    raise exception 'Not authorised to confirm this payment';
  end if;

  update payment_records set
    provider_confirmed_at = case when caller_is_provider or is_staff()
      then coalesce(provider_confirmed_at, now()) else provider_confirmed_at end,
    payer_confirmed_at = case when caller_is_occupant
      then coalesce(payer_confirmed_at, now()) else payer_confirmed_at end
  where id = payment returning * into row;

  if row.provider_confirmed_at is not null and row.payer_confirmed_at is not null then
    update payment_records
    set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
    where id = payment returning status::text into new_status;

    insert into payment_receipts (payment_id, receipt_number, verification_code)
    values (
      payment,
      'DS-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(payment::text, '-', ''), 1, 10)),
      upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 16))
    ) on conflict (payment_id) do nothing;
    perform ledger_auto_allocate(payment);
  else
    new_status := 'pending_confirmation';
  end if;

  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values (caller, 'payment.confirmed_by_party', 'payment', payment::text,
    jsonb_build_object('status', new_status));
  return new_status;
end;
$$;

create or replace function ledger_dispute_payment(payment uuid, reason text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  row payment_records%rowtype;
  dispute_id uuid;
  caller uuid := (select auth.uid());
begin
  if char_length(trim(reason)) < 10 then raise exception 'Provide a dispute reason'; end if;
  select * into row from payment_records where id = payment for update;
  if not found then raise exception 'Payment not found'; end if;
  if not is_occupancy_party(row.occupancy_id)
     and not provider_can_manage_occupancy(row.occupancy_id, 'record_payments')
     and not is_staff() then
    raise exception 'Not authorised to dispute this payment';
  end if;

  insert into payment_disputes (payment_id, opened_by, reason)
  values (payment, caller, trim(reason)) returning id into dispute_id;
  update payment_records
    set status = 'disputed', dispute_reason = trim(reason)
    where id = payment;
  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values (caller, 'payment.disputed', 'payment', payment::text,
    jsonb_build_object('dispute_id', dispute_id));
  return dispute_id;
end;
$$;

create or replace function ledger_reject_payment(payment uuid, reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  row payment_records%rowtype;
begin
  select * into row from payment_records where id = payment for update;
  if not found then raise exception 'Payment not found'; end if;
  if row.status <> 'pending_confirmation' then
    raise exception 'Only a pending payment can be rejected';
  end if;
  if not provider_can_manage_occupancy(row.occupancy_id, 'record_payments')
     and not is_staff() then
    raise exception 'Not authorised to reject this payment';
  end if;
  update payment_records
  set status = 'rejected', dispute_reason = nullif(trim(reason), '')
  where id = payment;
  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values ((select auth.uid()), 'payment.rejected', 'payment', payment::text,
    jsonb_build_object('reason', nullif(trim(reason), '')));
end;
$$;

create or replace function ledger_void_charge(charge uuid, reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  row charges%rowtype;
begin
  select * into row from charges where id = charge for update;
  if not found then raise exception 'Charge not found'; end if;
  if row.status not in ('unpaid', 'partially_paid') then
    raise exception 'Only an unpaid charge can be voided';
  end if;
  if exists (select 1 from payment_allocations where charge_id = charge) then
    raise exception 'Allocated charges require a financial adjustment';
  end if;
  if not provider_can_manage_occupancy(row.occupancy_id, 'record_payments')
     and not has_role('finance') and not is_staff() then
    raise exception 'Not authorised to void this charge';
  end if;
  update charges set status = 'void', voided_at = now(), void_reason = trim(reason)
  where id = charge;
  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values ((select auth.uid()), 'charge.voided', 'charge', charge::text,
    jsonb_build_object('reason', trim(reason)));
end;
$$;

create or replace function ledger_create_adjustment(
  payment uuid,
  amount_delta_mwk int,
  reason text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  adjustment_id uuid;
begin
  if amount_delta_mwk = 0 or char_length(trim(reason)) < 10 then
    raise exception 'A non-zero amount and reason are required';
  end if;
  if not has_role('finance') and not has_role('admin') then
    raise exception 'Finance or admin role required';
  end if;
  if not staff_mfa_satisfied() then raise exception 'MFA required'; end if;
  insert into payment_adjustments (payment_id, amount_delta_mwk, reason, created_by)
  values (payment, amount_delta_mwk, trim(reason), (select auth.uid()))
  returning id into adjustment_id;
  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values ((select auth.uid()), 'payment.adjusted', 'payment', payment::text,
    jsonb_build_object('adjustment_id', adjustment_id, 'amount_delta_mwk', amount_delta_mwk));
  return adjustment_id;
end;
$$;

revoke insert, update, delete on charges, payment_records, payment_allocations,
  payment_receipts, payment_disputes, payment_adjustments from authenticated;
revoke all on function ledger_create_charge(uuid, int, date, text) from public, anon;
revoke all on function ledger_record_payment(uuid, int, date, payment_method, text, text, uuid) from public, anon;
revoke all on function ledger_confirm_payment(uuid) from public, anon;
revoke all on function ledger_dispute_payment(uuid, text) from public, anon;
revoke all on function ledger_reject_payment(uuid, text) from public, anon;
revoke all on function ledger_void_charge(uuid, text) from public, anon;
revoke all on function ledger_create_adjustment(uuid, int, text) from public, anon;
grant execute on function ledger_create_charge(uuid, int, date, text) to authenticated;
grant execute on function ledger_record_payment(uuid, int, date, payment_method, text, text, uuid) to authenticated;
grant execute on function ledger_confirm_payment(uuid) to authenticated;
grant execute on function ledger_dispute_payment(uuid, text) to authenticated;
grant execute on function ledger_reject_payment(uuid, text) to authenticated;
grant execute on function ledger_void_charge(uuid, text) to authenticated;
grant execute on function ledger_create_adjustment(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Remaining operational entities used by provider and administration pages.
-- ---------------------------------------------------------------------------

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_email text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now()
);

create or replace view admin_user_directory
with (security_invoker = on) as
select
  p.id,
  p.full_name,
  p.email,
  p.account_status,
  p.created_at,
  coalesce(array_agg(ur.role::text) filter (where ur.role is not null), '{}') as roles
from profiles p
left join user_roles ur on ur.user_id = p.id
group by p.id;

create or replace view admin_provider_directory
with (security_invoker = on) as
select * from admin_user_directory where 'provider' = any(roles);

create or replace view admin_verifier_directory
with (security_invoker = on) as
select * from admin_user_directory where 'field_verifier' = any(roles);

create table if not exists organisation_members (
  organisation_id uuid not null references organisations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'manager', 'finance')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);

create table if not exists provider_expenses (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles (id) on delete cascade,
  space_id uuid references spaces (id) on delete set null,
  work_order_id uuid references maintenance_work_orders (id) on delete set null,
  amount_mwk int not null check (amount_mwk > 0),
  occurred_on date not null,
  category text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists service_provider_work_examples (
  id uuid primary key default gen_random_uuid(),
  service_provider_id uuid not null references service_provider_profiles (user_id) on delete cascade,
  title text not null,
  description text,
  storage_path text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table service_provider_profiles
  add column if not exists slug text,
  add column if not exists contact_verified_at timestamptz;

update service_provider_profiles
set slug = trim(both '-' from regexp_replace(lower(display_name), '[^a-z0-9]+', '-', 'g'))
  || '-' || substr(replace(user_id::text, '-', ''), 1, 6)
where slug is null;

create unique index if not exists service_provider_profiles_slug_idx
  on service_provider_profiles (slug) where slug is not null;

create table if not exists file_uploads (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid references profiles (id) on delete set null,
  bucket text not null,
  storage_path text not null,
  entity_type text not null,
  entity_id uuid,
  original_name text,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text,
  scan_status text not null default 'pending'
    check (scan_status in ('pending', 'clean', 'quarantined', 'failed')),
  scan_provider text,
  scanned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create table if not exists listing_status_history (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings (id) on delete cascade,
  from_status listing_status,
  to_status listing_status not null,
  actor_id uuid references profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists verification_assignments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  verifier_id uuid not null references profiles (id) on delete restrict,
  assigned_by uuid not null references profiles (id) on delete restrict,
  status text not null default 'assigned'
    check (status in ('assigned', 'downloaded', 'in_progress', 'submitted', 'cancelled', 'expired')),
  due_at timestamptz not null,
  verification_id uuid references verifications (id) on delete set null,
  assigned_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists verification_evidence (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references verification_assignments (id) on delete cascade,
  verification_id uuid references verifications (id) on delete set null,
  uploader_id uuid not null references profiles (id) on delete restrict,
  kind text not null check (kind in ('photo', 'audio', 'document')),
  bucket text not null default 'verification-private',
  storage_path text not null,
  file_upload_id uuid references file_uploads (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create unique index if not exists one_active_verification_assignment
  on verification_assignments (listing_id)
  where status in ('assigned', 'downloaded', 'in_progress');
create index if not exists verification_assignments_verifier_idx
  on verification_assignments (verifier_id, status, due_at);

create or replace function record_listing_status_history()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into listing_status_history (
      listing_id, from_status, to_status, actor_id
    ) values (
      new.id,
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

revoke all on function record_listing_status_history() from public, anon, authenticated;
drop trigger if exists listing_status_history_trigger on listings;
create trigger listing_status_history_trigger
  after insert or update of status on listings
  for each row execute function record_listing_status_history();

grant select on organisations to anon, authenticated;
grant select on admin_user_directory, admin_provider_directory,
  admin_verifier_directory to authenticated;
grant select on organisation_members, provider_expenses,
  service_provider_work_examples, file_uploads, listing_status_history to authenticated;
grant insert, update on organisations, organisation_members to authenticated;
grant insert, update on provider_expenses, service_provider_work_examples,
  file_uploads to authenticated;
grant select, insert, update on verification_assignments to authenticated;
grant select, insert on verification_evidence to authenticated;

alter table organisations enable row level security;
alter table organisation_members enable row level security;
alter table provider_expenses enable row level security;
alter table service_provider_work_examples enable row level security;
alter table file_uploads enable row level security;
alter table listing_status_history enable row level security;
alter table verification_assignments enable row level security;
alter table verification_evidence enable row level security;

create policy "active organisations read" on organisations
  for select using (status = 'active' or is_staff());
create policy "admin manages organisations" on organisations
  for all to authenticated
  using (has_role('admin')) with check (has_role('admin'));
create policy "organisation membership read" on organisation_members
  for select to authenticated
  using (user_id = (select auth.uid()) or has_role('admin'));
create policy "admin manages organisation membership" on organisation_members
  for all to authenticated
  using (has_role('admin')) with check (has_role('admin'));
create policy "provider expense access" on provider_expenses
  for all to authenticated
  using (
    provider_id = (select auth.uid())
    or provider_team_has(provider_id, 'view_reports')
    or has_role('finance') or is_staff()
  )
  with check (
    provider_id = (select auth.uid())
    or provider_team_has(provider_id, 'view_reports')
    or has_role('finance') or is_staff()
  );
create policy "approved work examples public read" on service_provider_work_examples
  for select using (
    approved_at is not null
    or service_provider_id = (select auth.uid())
    or is_staff()
  );
create policy "trade manages work examples" on service_provider_work_examples
  for all to authenticated
  using (service_provider_id = (select auth.uid()) or is_staff())
  with check (service_provider_id = (select auth.uid()) or is_staff());
create policy "upload registry access" on file_uploads
  for select to authenticated
  using (uploader_id = (select auth.uid()) or is_staff());
create policy "upload registry insert" on file_uploads
  for insert to authenticated
  with check (uploader_id = (select auth.uid()));
create policy "listing history participants read" on listing_status_history
  for select to authenticated
  using (
    exists (
      select 1 from listings l
      where l.id = listing_status_history.listing_id
        and (owns_space(l.space_id) or is_staff())
    )
  );

create policy "verification assignment read" on verification_assignments
  for select to authenticated
  using (
    verifier_id = (select auth.uid())
    or has_role('moderator')
    or has_role('admin')
  );
create policy "reviewer creates verification assignment" on verification_assignments
  for insert to authenticated
  with check (
    (has_role('moderator') or has_role('admin'))
    and staff_mfa_satisfied()
    and assigned_by = (select auth.uid())
  );
create policy "assignment parties update" on verification_assignments
  for update to authenticated
  using (
    verifier_id = (select auth.uid())
    or has_role('moderator')
    or has_role('admin')
  )
  with check (
    verifier_id = (select auth.uid())
    or has_role('moderator')
    or has_role('admin')
  );
create policy "verification evidence read" on verification_evidence
  for select to authenticated
  using (
    uploader_id = (select auth.uid())
    or has_role('moderator')
    or has_role('admin')
  );
create policy "assigned verifier evidence insert" on verification_evidence
  for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and exists (
      select 1 from verification_assignments va
      where va.id = verification_evidence.assignment_id
        and va.verifier_id = (select auth.uid())
        and va.status in ('assigned', 'downloaded', 'in_progress', 'submitted')
    )
  );

create policy "staff verification media insert" on space_media
  for insert to authenticated
  with check (bucket = 'verification-private' and is_staff());

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'
]
where id = 'verification-private';

create policy "verification quarantine read guard" on storage.objects
  as restrictive for select to authenticated
  using (
    bucket_id <> 'verification-private'
    or not exists (
      select 1 from file_uploads fu
      where fu.bucket = storage.objects.bucket_id
        and fu.storage_path = storage.objects.name
        and fu.scan_status <> 'clean'
    )
  );

create or replace function assign_verification_visit(
  target_listing uuid,
  target_verifier uuid,
  due_at timestamptz
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  caller uuid := (select auth.uid());
  listing_state listing_status;
  assignment_uuid uuid;
begin
  if caller is null or not (has_role('moderator') or has_role('admin')) then
    raise exception 'Moderator or admin role required';
  end if;
  if not staff_mfa_satisfied() then raise exception 'MFA required'; end if;
  if due_at <= now() then raise exception 'Due date must be in the future'; end if;
  if not exists (
    select 1 from user_roles ur
    join profiles p on p.id = ur.user_id
    where ur.user_id = target_verifier
      and ur.role = 'field_verifier'
      and p.account_status = 'active'
  ) then
    raise exception 'An active field verifier is required';
  end if;

  select status into listing_state
  from listings where id = target_listing for update;
  if not found then raise exception 'Listing not found'; end if;
  if listing_state not in (
    'pending_review', 'submitted', 'under_review',
    'authority_review', 'verification_pending'
  ) then
    raise exception 'Listing is not ready for field verification';
  end if;

  if listing_state <> 'verification_pending' then
    update listings set status = 'verification_pending'
    where id = target_listing;
  end if;

  insert into verification_assignments (
    listing_id, verifier_id, assigned_by, due_at
  ) values (
    target_listing, target_verifier, caller, due_at
  ) returning id into assignment_uuid;

  update listings set status = 'verification_scheduled'
  where id = target_listing;

  insert into audit_events (
    actor_id, actor_role, action, entity, entity_id, after_state
  ) values (
    caller, 'moderator', 'verification.assigned', 'listing',
    target_listing::text,
    jsonb_build_object(
      'assignment_id', assignment_uuid,
      'verifier_id', target_verifier,
      'due_at', due_at
    )
  );
  return assignment_uuid;
end;
$$;

revoke all on function assign_verification_visit(uuid, uuid, timestamptz)
  from public, anon;
grant execute on function assign_verification_visit(uuid, uuid, timestamptz)
  to authenticated;

create or replace function submit_verification_assignment(
  assignment uuid,
  checklist_payload jsonb,
  verifier_notes text default null,
  client_event_id text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  assignment_row verification_assignments%rowtype;
  verification_uuid uuid;
  caller uuid := (select auth.uid());
begin
  if caller is null or not has_role('field_verifier') then
    raise exception 'Field verifier role required';
  end if;
  if not staff_mfa_satisfied() then raise exception 'MFA required'; end if;
  select * into assignment_row
  from verification_assignments where id = assignment for update;
  if not found or assignment_row.verifier_id <> caller then
    raise exception 'Assignment not found';
  end if;
  if assignment_row.status not in ('assigned', 'downloaded', 'in_progress') then
    if assignment_row.status = 'submitted' and assignment_row.verification_id is not null then
      return assignment_row.verification_id;
    end if;
    raise exception 'Assignment is not open';
  end if;
  if assignment_row.due_at < now() then
    update verification_assignments set status = 'expired', updated_at = now()
    where id = assignment;
    raise exception 'Assignment has expired';
  end if;
  if jsonb_typeof(checklist_payload) <> 'object'
     or not checklist_payload ? 'recommendation' then
    raise exception 'Complete checklist and recommendation are required';
  end if;

  insert into verifications (
    listing_id, verifier_id, status, checklist, notes
  ) values (
    assignment_row.listing_id, caller, 'pending', checklist_payload,
    nullif(trim(verifier_notes), '')
  ) returning id into verification_uuid;

  update verification_assignments
  set status = 'submitted', verification_id = verification_uuid,
      submitted_at = now(), updated_at = now()
  where id = assignment;

  update listings set status = 'verification_completed'
  where id = assignment_row.listing_id;

  if client_event_id is not null then
    insert into verifier_sync_events (
      client_generated_id, verifier_id, assignment_id, event_type,
      payload, status, applied_at
    ) values (
      client_event_id, caller, assignment_row.listing_id,
      'verification_submission', checklist_payload, 'applied', now()
    ) on conflict (verifier_id, client_generated_id) do update
      set status = 'applied', applied_at = now(), error = null;
  end if;

  insert into audit_events (
    actor_id, actor_role, action, entity, entity_id, after_state
  ) values (
    caller, 'field_verifier', 'verification.checklist_submitted',
    'verification_assignment', assignment::text,
    jsonb_build_object(
      'verification_id', verification_uuid,
      'recommendation', checklist_payload ->> 'recommendation'
    )
  );
  return verification_uuid;
end;
$$;

revoke all on function submit_verification_assignment(uuid, jsonb, text, text)
  from public, anon;
grant execute on function submit_verification_assignment(uuid, jsonb, text, text)
  to authenticated;

create or replace function approve_and_publish_listing(target_listing uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  caller uuid := (select auth.uid());
  listing_row listings%rowtype;
  verification_row verifications%rowtype;
  approved_at timestamptz := now();
begin
  if caller is null or not (has_role('moderator') or has_role('admin')) then
    raise exception 'Moderator or admin role required';
  end if;
  if not staff_mfa_satisfied() then raise exception 'MFA required'; end if;

  select * into listing_row
  from listings where id = target_listing for update;
  if not found then raise exception 'Listing not found'; end if;
  if listing_row.status not in ('verification_completed', 'supervisor_review') then
    raise exception 'A completed field verification is required';
  end if;

  select * into verification_row
  from verifications
  where listing_id = target_listing and status = 'pending'
  order by created_at desc
  limit 1 for update;
  if not found then raise exception 'Pending verification not found'; end if;

  update verifications
  set status = 'approved',
      verified_at = approved_at,
      reverify_by = (approved_at + interval '90 days')::date,
      checklist = coalesce(checklist, '{}'::jsonb) || jsonb_build_object(
        'reviewer_decision', 'approved',
        'reviewer_id', caller
      )
  where id = verification_row.id;

  if listing_row.status = 'verification_completed' then
    update listings set status = 'supervisor_review'
    where id = target_listing;
  end if;
  update listings set status = 'approved' where id = target_listing;
  update listings set status = 'published' where id = target_listing;

  insert into audit_events (
    actor_id, actor_role, action, entity, entity_id,
    before_state, after_state
  ) values (
    caller, 'moderator', 'listing.published', 'listing',
    target_listing::text,
    jsonb_build_object(
      'status', listing_row.status,
      'verification_status', verification_row.status
    ),
    jsonb_build_object(
      'status', 'published',
      'verification_status', 'approved'
    )
  );
end;
$$;

revoke all on function approve_and_publish_listing(uuid) from public, anon;
grant execute on function approve_and_publish_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Viewing privacy and safety records.
-- ---------------------------------------------------------------------------

create table if not exists viewing_private_details (
  viewing_id uuid primary key references viewings (id) on delete cascade,
  detailed_directions text,
  meeting_contact text,
  released_at timestamptz,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists viewing_safety_checkins (
  id uuid primary key default gen_random_uuid(),
  viewing_id uuid not null references viewings (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null check (status in ('departing', 'arrived', 'safe', 'needs_help')),
  note text,
  created_at timestamptz not null default now()
);

grant select, insert, update on viewing_private_details to authenticated;
grant select, insert on viewing_safety_checkins to authenticated;
alter table viewing_private_details enable row level security;
alter table viewing_safety_checkins enable row level security;

create policy "confirmed viewing private details read" on viewing_private_details
  for select to authenticated
  using (
    released_at is not null
    and exists (
      select 1 from viewings v
      join enquiries e on e.id = v.enquiry_id
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where v.id = viewing_private_details.viewing_id
        and v.status = 'confirmed'
        and (
          e.seeker_id = (select auth.uid())
          or s.provider_id = (select auth.uid())
          or provider_team_has(s.provider_id, 'manage_viewings')
          or is_staff()
        )
    )
  );
create policy "provider manages viewing private details" on viewing_private_details
  for all to authenticated
  using (
    exists (
      select 1 from viewings v
      join enquiries e on e.id = v.enquiry_id
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where v.id = viewing_private_details.viewing_id
        and (
          s.provider_id = (select auth.uid())
          or provider_team_has(s.provider_id, 'manage_viewings')
          or is_staff()
        )
    )
  )
  with check (
    exists (
      select 1 from viewings v
      join enquiries e on e.id = v.enquiry_id
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where v.id = viewing_private_details.viewing_id
        and (
          s.provider_id = (select auth.uid())
          or provider_team_has(s.provider_id, 'manage_viewings')
          or is_staff()
        )
    )
  );
create policy "own viewing safety checkins" on viewing_safety_checkins
  for all to authenticated
  using (user_id = (select auth.uid()) or is_staff())
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from viewings v
      join enquiries e on e.id = v.enquiry_id
      join listings l on l.id = e.listing_id
      join spaces s on s.id = l.space_id
      where v.id = viewing_safety_checkins.viewing_id
        and (
          e.seeker_id = (select auth.uid())
          or s.provider_id = (select auth.uid())
          or provider_team_has(s.provider_id, 'manage_viewings')
        )
    )
  );

create or replace function access_viewing_directions(viewing uuid)
returns table (detailed_directions text, meeting_contact text, released_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from viewings v
    join enquiries e on e.id = v.enquiry_id
    join listings l on l.id = e.listing_id
    join spaces s on s.id = l.space_id
    where v.id = viewing and v.status = 'confirmed'
      and (
        e.seeker_id = (select auth.uid())
        or s.provider_id = (select auth.uid())
        or provider_team_has(s.provider_id, 'manage_viewings')
        or is_staff()
      )
  ) then
    raise exception 'Confirmed viewing access required';
  end if;

  insert into audit_events (actor_id, action, entity, entity_id)
  values ((select auth.uid()), 'viewing.directions_accessed', 'viewing', viewing::text);

  return query
  select vpd.detailed_directions, vpd.meeting_contact, vpd.released_at
  from viewing_private_details vpd
  where vpd.viewing_id = viewing and vpd.released_at is not null;
end;
$$;

revoke all on function access_viewing_directions(uuid) from public, anon;
grant execute on function access_viewing_directions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Audit records are append-only through normal application credentials.
-- ---------------------------------------------------------------------------

create or replace function prevent_audit_mutation()
returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'Audit events are append-only';
end;
$$;

revoke all on function prevent_audit_mutation() from public, anon, authenticated;
drop trigger if exists audit_events_append_only on audit_events;
create trigger audit_events_append_only
  before update or delete on audit_events
  for each row execute function prevent_audit_mutation();

revoke update, delete on audit_events from authenticated, anon;

-- Useful indexes for paginated operational screens and RLS predicates.
create index if not exists user_roles_user_role_idx on user_roles (user_id, role);
create index if not exists occupancies_provider_created_idx on occupancies (provider_id, created_at desc);
create index if not exists viewing_safety_viewing_idx on viewing_safety_checkins (viewing_id, created_at desc);
create index if not exists provider_expenses_provider_date_idx on provider_expenses (provider_id, occurred_on desc);
create index if not exists file_uploads_scan_idx on file_uploads (scan_status, created_at) where scan_status <> 'clean';
