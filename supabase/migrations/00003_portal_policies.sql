-- Policies required by the role-gated portals: admins manage roles and
-- feature flags, staff write audit events from server actions.

-- Field verifiers collect evidence; moderators/admins decide publication.
-- Direct Data API updates must enforce the same separation as the UI.
drop policy if exists "provider or staff updates listing" on listings;

create policy "provider or reviewer updates listing" on listings
  for update to authenticated
  using (owns_space(space_id) or has_role('moderator') or has_role('admin'))
  with check (owns_space(space_id) or has_role('moderator') or has_role('admin'));

drop policy if exists "staff verification update" on verifications;

create policy "reviewer verification update" on verifications
  for update to authenticated
  using (has_role('moderator') or has_role('admin'))
  with check (has_role('moderator') or has_role('admin'));

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

    select s.category, s.zone_id into space_rec
    from spaces s where s.id = new.space_id;

    if space_rec.zone_id is null then
      raise exception 'Listing cannot be published without a zone';
    end if;

    if space_rec.category::text in ('room', 'shared_room')
       and not feature_enabled('residential_listings') then
      raise exception 'Residential listings are not yet enabled';
    end if;

    if space_rec.category::text = 'family_accommodation'
       and not feature_enabled('family_accommodation') then
      raise exception 'Family accommodation listings are not yet enabled';
    end if;

    if not exists (
      select 1 from space_internal si
      where si.space_id = new.space_id
        and si.authority_basis is not null
    ) then
      raise exception 'Listing cannot be published without an authority-to-offer record';
    end if;

    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

revoke execute on function enforce_listing_publication() from public, anon, authenticated;

create policy "admin manages roles" on user_roles
  for insert to authenticated
  with check (has_role('admin'));

create policy "admin removes roles" on user_roles
  for delete to authenticated
  using (has_role('admin'));

create policy "staff audit insert" on audit_events
  for insert to authenticated
  with check (is_staff());

create policy "admin updates flags" on feature_flags
  for update to authenticated
  using (has_role('admin'))
  with check (
    has_role('admin')
    and not (
      name in (
        'deposit_processing',
        'mobile_money_processing',
        'residential_listings',
        'family_accommodation'
      )
      and enabled
    )
  );

grant update on feature_flags to authenticated;
