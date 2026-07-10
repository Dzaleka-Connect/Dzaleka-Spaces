-- Production email delivery: concurrent-safe outbox claims and verified,
-- idempotent Resend delivery-event recording.

alter type notification_status add value if not exists 'delivered';
alter type notification_status add value if not exists 'bounced';
alter type notification_status add value if not exists 'complained';
alter type notification_status add value if not exists 'delayed';
alter type notification_status add value if not exists 'suppressed';

create unique index if not exists notification_delivery_provider_message
  on notification_deliveries (provider, provider_message_id)
  where provider_message_id is not null;

create table if not exists email_delivery_events (
  id text primary key,
  provider text not null default 'resend',
  provider_message_id text not null,
  event_type text not null check (event_type in (
    'email.sent', 'email.delivered', 'email.bounced', 'email.complained',
    'email.delivery_delayed', 'email.failed', 'email.suppressed'
  )),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

create index if not exists email_delivery_events_message_idx
  on email_delivery_events (provider_message_id, occurred_at desc);

grant select on email_delivery_events to authenticated;
alter table email_delivery_events enable row level security;

create policy "admin reads email delivery events" on email_delivery_events
  for select to authenticated
  using (
    (has_role('admin') or has_role('moderator'))
    and staff_mfa_satisfied()
  );

create or replace function claim_notification_batch(batch_size int default 20)
returns setof notification_queue
language plpgsql security definer set search_path = public as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Service role required';
  end if;
  return query
  with candidates as (
    select id from notification_queue
    where status = 'pending' and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit greatest(1, least(batch_size, 100))
  )
  update notification_queue q
  set status = 'processing',
      locked_at = now(),
      attempts = q.attempts + 1
  from candidates c
  where q.id = c.id
  returning q.*;
end;
$$;

revoke all on function claim_notification_batch(int)
  from public, anon, authenticated;
grant execute on function claim_notification_batch(int) to service_role;

create or replace function record_resend_delivery_event(
  provider_event_id text,
  message_id text,
  delivery_event_type text,
  event_time timestamptz
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  inserted_count int;
  delivery_state notification_status;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if delivery_event_type not in (
    'email.sent', 'email.delivered', 'email.bounced', 'email.complained',
    'email.delivery_delayed', 'email.failed', 'email.suppressed'
  ) then
    raise exception 'Unsupported Resend event';
  end if;

  insert into email_delivery_events (
    id, provider_message_id, event_type, occurred_at
  ) values (
    provider_event_id, message_id, delivery_event_type, event_time
  ) on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;

  delivery_state := case delivery_event_type
    when 'email.sent' then 'sent'::notification_status
    when 'email.delivered' then 'delivered'::notification_status
    when 'email.bounced' then 'bounced'::notification_status
    when 'email.complained' then 'complained'::notification_status
    when 'email.delivery_delayed' then 'delayed'::notification_status
    when 'email.suppressed' then 'suppressed'::notification_status
    else 'failed'::notification_status
  end;

  update notification_deliveries
  set status = delivery_state,
      error = case
        when delivery_state in ('bounced', 'complained', 'failed', 'suppressed')
          then replace(delivery_event_type, 'email.', '')
        else null
      end
  where provider = 'resend' and provider_message_id = message_id;

  if delivery_state in ('bounced', 'complained', 'failed', 'suppressed') then
    update notification_queue q
    set status = 'failed', error = 'Resend: ' || replace(delivery_event_type, 'email.', '')
    from notification_deliveries d
    where d.queue_id = q.id
      and d.provider = 'resend'
      and d.provider_message_id = message_id;
  end if;
  return true;
end;
$$;

revoke all on function record_resend_delivery_event(text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function record_resend_delivery_event(text, text, text, timestamptz)
  to service_role;
