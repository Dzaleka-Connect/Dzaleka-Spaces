-- Pilot delivery policy: email and in-app notifications only.
-- SMS, WhatsApp, web push, payment processing and mobile-money adapters remain
-- locked until a separately reviewed operational migration changes this rule.

insert into feature_flags (name, enabled, description) values
  ('sms_notifications', false, 'Outbound SMS is not enabled for the pilot.'),
  ('whatsapp_notifications', false, 'Outbound WhatsApp is not enabled for the pilot.'),
  ('web_push_notifications', false, 'Web push is not enabled for the pilot.'),
  ('mobile_money_processing', false, 'External payment processing is prohibited during the ledger-only pilot.'),
  ('mobile_money_integrations', false, 'Mobile-money provider adapters are not enabled for the pilot.')
on conflict (name) do update
set enabled = false,
    description = excluded.description,
    updated_at = now();

create or replace function enforce_protected_feature_flags()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.enabled and new.name in (
    'payment_processing', 'mobile_money_processing',
    'mobile_money_integrations', 'deposit_custody', 'deposit_processing',
    'residential_listings', 'family_accommodation',
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

-- Idempotent charge creation prevents duplicate ledger entries after retries.
alter table charges add column if not exists idempotency_key uuid;

create unique index if not exists charges_creator_idempotency_key
  on charges (created_by, idempotency_key)
  where created_by is not null and idempotency_key is not null;

create or replace function ledger_create_charge(
  occupancy uuid,
  amount_mwk int,
  due_on date,
  charge_description text,
  idempotency uuid
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  charge_id uuid;
  caller uuid := (select auth.uid());
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if amount_mwk <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if not provider_can_manage_occupancy(occupancy, 'record_payments')
     and not is_staff() then
    raise exception 'Not authorised to create this charge';
  end if;

  select id into charge_id from charges
  where created_by = caller and idempotency_key = idempotency;
  if charge_id is not null then return charge_id; end if;

  insert into charges (
    occupancy_id, amount_mwk, due_date, description, created_by,
    idempotency_key
  ) values (
    occupancy, amount_mwk, due_on,
    nullif(trim(charge_description), ''), caller, idempotency
  ) returning id into charge_id;

  insert into audit_events (actor_id, action, entity, entity_id, after_state)
  values (
    caller, 'charge.created', 'charge', charge_id::text,
    jsonb_build_object(
      'occupancy_id', occupancy,
      'amount_mwk', amount_mwk,
      'due_date', due_on
    )
  );
  return charge_id;
end;
$$;

revoke all on function ledger_create_charge(uuid, int, date, text, uuid)
  from public, anon;
grant execute on function ledger_create_charge(uuid, int, date, text, uuid)
  to authenticated;
