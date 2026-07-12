-- Read-only DzalekaPay reconciliation for externally completed payments.
-- This migration does not enable payment initiation, custody, or any locked
-- pilot feature flag. Internal payment confirmation remains a two-party act.

create table dzalekapay_reconciliations (
  payment_id uuid primary key references payment_records (id) on delete restrict,
  transaction_id uuid not null unique,
  merchant_id uuid not null,
  provider_status text not null check (char_length(provider_status) between 1 and 50),
  reconciliation_status text not null check (
    reconciliation_status in (
      'pending', 'verified', 'failed', 'refunded', 'amount_mismatch', 'unknown'
    )
  ),
  amount_mwk int not null check (amount_mwk > 0),
  reference text check (reference is null or char_length(reference) between 1 and 100),
  provider_created_at timestamptz not null,
  provider_updated_at timestamptz not null,
  last_verified_at timestamptz not null default now(),
  source text not null check (source in ('api', 'webhook')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table dzalekapay_webhook_events (
  delivery_id uuid primary key,
  event_type text not null check (event_type in ('transaction.created', 'transaction.updated')),
  transaction_id uuid not null,
  merchant_id uuid not null,
  provider_status text not null check (char_length(provider_status) between 1 and 50),
  amount_mwk int not null check (amount_mwk > 0),
  reference text check (reference is null or char_length(reference) between 1 and 100),
  event_created_at timestamptz not null,
  provider_created_at timestamptz not null,
  provider_updated_at timestamptz not null,
  matched_payment_id uuid references payment_records (id) on delete restrict,
  reconciliation_status text check (
    reconciliation_status is null or reconciliation_status in (
      'pending', 'verified', 'failed', 'refunded', 'amount_mismatch', 'unknown'
    )
  ),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index dzalekapay_webhook_transaction_idx
  on dzalekapay_webhook_events (transaction_id, provider_updated_at desc);

-- A DzalekaPay UUID can identify only one local payment record. Existing
-- non-UUID legacy references remain untouched and are not reconcilable.
create unique index payment_records_dzalekapay_transaction_idx
  on payment_records (lower(external_reference))
  where method = 'dzalekapay'
    and external_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

grant select on dzalekapay_reconciliations to authenticated;
revoke all on dzalekapay_reconciliations, dzalekapay_webhook_events from anon;
revoke insert, update, delete on dzalekapay_reconciliations from authenticated;
revoke all on dzalekapay_webhook_events from authenticated;

alter table dzalekapay_reconciliations enable row level security;
alter table dzalekapay_webhook_events enable row level security;

create policy "payment parties read DzalekaPay reconciliation"
  on dzalekapay_reconciliations for select to authenticated
  using (
    exists (
      select 1
      from payment_records pr
      where pr.id = payment_id
        and (
          is_occupancy_party(pr.occupancy_id)
          or is_occupancy_provider(pr.occupancy_id)
          or (is_staff() and staff_mfa_satisfied())
        )
    )
  );

create or replace function enforce_dzalekapay_receipt_verification()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.method = 'dzalekapay'
    and new.status = 'confirmed'
    and old.status is distinct from 'confirmed'
    and not exists (
      select 1
      from dzalekapay_reconciliations reconciliation
      where reconciliation.payment_id = new.id
        and reconciliation.transaction_id::text = lower(new.external_reference)
        and reconciliation.provider_status = 'completed'
        and reconciliation.reconciliation_status = 'verified'
        and reconciliation.amount_mwk = new.amount_mwk
    ) then
    raise exception 'DzalekaPay transaction must be completed and amount-matched before confirmation';
  end if;
  return new;
end;
$$;

revoke all on function enforce_dzalekapay_receipt_verification() from public, anon, authenticated;

create trigger dzalekapay_receipt_verification_guard
  before update of status on payment_records
  for each row execute function enforce_dzalekapay_receipt_verification();

create or replace function record_dzalekapay_reconciliation(
  payment uuid,
  transaction_id_value uuid,
  merchant_id_value uuid,
  provider_status_value text,
  provider_amount_mwk int,
  provider_reference text,
  provider_created timestamptz,
  provider_updated timestamptz
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  payment_row payment_records%rowtype;
  resolved_status text;
begin
  select * into payment_row from payment_records where id = payment for update;
  if not found then raise exception 'Payment record not found'; end if;
  if payment_row.method <> 'dzalekapay' then
    raise exception 'Payment record is not a DzalekaPay payment';
  end if;
  if payment_row.external_reference is null
    or lower(payment_row.external_reference) <> lower(transaction_id_value::text) then
    raise exception 'DzalekaPay transaction does not match the payment reference';
  end if;
  if char_length(provider_status_value) not between 1 and 50
    or provider_amount_mwk <= 0
    or provider_created is null
    or provider_updated is null then
    raise exception 'Invalid DzalekaPay transaction data';
  end if;

  resolved_status := case
    when provider_amount_mwk <> payment_row.amount_mwk then 'amount_mismatch'
    when provider_status_value = 'completed' then 'verified'
    when provider_status_value = 'pending' then 'pending'
    when provider_status_value in ('failed', 'expired') then 'failed'
    when provider_status_value = 'refunded' then 'refunded'
    else 'unknown'
  end;

  insert into dzalekapay_reconciliations (
    payment_id, transaction_id, merchant_id, provider_status,
    reconciliation_status, amount_mwk, reference, provider_created_at,
    provider_updated_at, last_verified_at, source
  ) values (
    payment, transaction_id_value, merchant_id_value, provider_status_value,
    resolved_status, provider_amount_mwk, nullif(trim(provider_reference), ''), provider_created,
    provider_updated, now(), 'api'
  )
  on conflict (payment_id) do update set
    transaction_id = excluded.transaction_id,
    merchant_id = excluded.merchant_id,
    provider_status = excluded.provider_status,
    reconciliation_status = excluded.reconciliation_status,
    amount_mwk = excluded.amount_mwk,
    reference = excluded.reference,
    provider_created_at = excluded.provider_created_at,
    provider_updated_at = excluded.provider_updated_at,
    last_verified_at = now(),
    source = 'api',
    updated_at = now()
  where excluded.provider_updated_at >= dzalekapay_reconciliations.provider_updated_at;

  return resolved_status;
end;
$$;

create or replace function record_dzalekapay_webhook_event(
  delivery_id_value uuid,
  event_type_value text,
  transaction_id_value uuid,
  merchant_id_value uuid,
  provider_status_value text,
  provider_amount_mwk int,
  provider_reference text,
  event_created timestamptz,
  provider_created timestamptz,
  provider_updated timestamptz
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  payment_row payment_records%rowtype;
  resolved_status text;
  inserted_count int;
begin
  if event_type_value not in ('transaction.created', 'transaction.updated')
    or char_length(provider_status_value) not between 1 and 50
    or provider_amount_mwk <= 0
    or event_created is null
    or provider_created is null
    or provider_updated is null then
    raise exception 'Invalid DzalekaPay webhook event';
  end if;

  select * into payment_row
  from payment_records
  where method = 'dzalekapay'
    and lower(external_reference) = lower(transaction_id_value::text)
  limit 1
  for update;

  if found then
    resolved_status := case
      when provider_amount_mwk <> payment_row.amount_mwk then 'amount_mismatch'
      when provider_status_value = 'completed' then 'verified'
      when provider_status_value = 'pending' then 'pending'
      when provider_status_value in ('failed', 'expired') then 'failed'
      when provider_status_value = 'refunded' then 'refunded'
      else 'unknown'
    end;
  end if;

  insert into dzalekapay_webhook_events (
    delivery_id, event_type, transaction_id, merchant_id, provider_status,
    amount_mwk, reference, event_created_at, provider_created_at,
    provider_updated_at, matched_payment_id, reconciliation_status, processed_at
  ) values (
    delivery_id_value, event_type_value, transaction_id_value, merchant_id_value,
    provider_status_value, provider_amount_mwk, nullif(trim(provider_reference), ''),
    event_created, provider_created, provider_updated, payment_row.id,
    resolved_status, case when payment_row.id is null then null else now() end
  )
  on conflict (delivery_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object('inserted', false, 'matched', false);
  end if;

  if payment_row.id is not null then
    insert into dzalekapay_reconciliations (
      payment_id, transaction_id, merchant_id, provider_status,
      reconciliation_status, amount_mwk, reference, provider_created_at,
      provider_updated_at, last_verified_at, source
    ) values (
      payment_row.id, transaction_id_value, merchant_id_value, provider_status_value,
      resolved_status, provider_amount_mwk, nullif(trim(provider_reference), ''),
      provider_created, provider_updated, now(), 'webhook'
    )
    on conflict (payment_id) do update set
      transaction_id = excluded.transaction_id,
      merchant_id = excluded.merchant_id,
      provider_status = excluded.provider_status,
      reconciliation_status = excluded.reconciliation_status,
      amount_mwk = excluded.amount_mwk,
      reference = excluded.reference,
      provider_created_at = excluded.provider_created_at,
      provider_updated_at = excluded.provider_updated_at,
      last_verified_at = now(),
      source = 'webhook',
      updated_at = now()
    where excluded.provider_updated_at >= dzalekapay_reconciliations.provider_updated_at;
  end if;

  return jsonb_build_object('inserted', true, 'matched', payment_row.id is not null);
end;
$$;

revoke all on function record_dzalekapay_reconciliation(
  uuid, uuid, uuid, text, int, text, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function record_dzalekapay_webhook_event(
  uuid, text, uuid, uuid, text, int, text, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function record_dzalekapay_reconciliation(
  uuid, uuid, uuid, text, int, text, timestamptz, timestamptz
) to service_role;
grant execute on function record_dzalekapay_webhook_event(
  uuid, text, uuid, uuid, text, int, text, timestamptz, timestamptz, timestamptz
) to service_role;
