-- Pilot seed data: published listings with approved field verifications.
-- Sequential inserts (spaces → authority record → listing → verification) so
-- the listing_publication_guard trigger sees each authority record in time.
-- Provider is null until real provider accounts claim these spaces.

do $$
declare
  rec record;
  sid uuid;
  lid uuid;
begin
  for rec in
    select * from (values
      ('community_venue', 'Kawale 1', 'Main market, next to the water point',
       'Large hall suitable for community meetings, ceremonies and trainings. Seats up to 120 people on benches. Chairs and tables can be arranged with advance notice. Daytime bookings preferred.',
       1, 120, 'water,toilet,solar,accessible',
       'Community hall near the main market', 25000, null::int, 'daily', null, true, true),
      ('training_space', 'Lisungwi', 'Near the youth centre',
       'Quiet training room for up to 25 participants. Reliable electricity, Wi-Fi, whiteboard and projector screen. Popular with NGOs running digital-skills courses — book early for weekday mornings.',
       1, 25, 'electricity,internet,toilet,furnished',
       'Training room with electricity and internet', 15000, null, 'daily', null, true, true),
      ('office', 'Likuni 1', 'Along the road to the health centre',
       'Furnished office room suitable for a small organisation or freelancer. Desk, two chairs and a lockable cabinet included. Shared toilet and water point in the compound.',
       1, 4, 'furnished,secure_lock,water,toilet,solar',
       'Small office room, furnished', 40000, 40000, 'monthly', '2026-08-01', false, true),
      ('shop', 'Kawale 2', 'Main market, front row',
       'Shop space in a busy part of the market. Strong foot traffic on market days. Metal door with secure lock. Electricity connection available at extra cost.',
       1, null::int, 'secure_lock',
       'Market-side shop space', 35000, 70000, 'monthly', null, false, false),
      ('workshop', 'Katudza', 'Behind the secondary school',
       'Covered workshop space previously used for carpentry. Includes an attached storage room. Solar power installed; suitable for light tools. Shared compound with one other business.',
       2, null, 'solar,secure_lock,water',
       'Carpentry workshop with storage', 50000, 50000, 'monthly', '2026-07-15', false, true),
      ('storage', 'New Katubza', 'Near the food distribution point',
       'Dry, secure storage room suitable for stock or equipment. Raised floor, iron sheets in good condition, strong door with two locks. Access by arrangement with the provider.',
       1, null, 'secure_lock',
       'Dry storage room, lockable', 20000, 20000, 'monthly', null, false, true),
      ('homestay', 'Dzaleka Hill', 'Five minutes from the cultural centre',
       'Private room in a family compound for visitors, operated through the approved homestay programme. Includes breakfast, mosquito net and solar lighting. Connected with Visit Dzaleka experiences.',
       1, 2, 'furnished,solar,water,toilet,cooking',
       'Homestay room for visitors (approved operator)', 18000, null, 'daily', null, true, true),
      ('meeting_venue', 'Zomba', 'Church compound near the football ground',
       'Meeting room for up to 15 people, available on weekdays. Benches and a table provided. Quiet surroundings, suitable for committee meetings and study groups.',
       1, 15, 'toilet,accessible',
       'Meeting room for small groups', 8000, null, 'daily', null, false, false)
    ) as t(category, zone, landmark, description, rooms, capacity, facilities,
           title, price_mwk, deposit_mwk, billing_period, available_from,
           featured, verified)
  loop
    insert into spaces (category, zone_id, landmark, description, rooms, capacity, facilities)
    values (
      rec.category::space_category,
      (select id from zones where name = rec.zone),
      rec.landmark,
      rec.description,
      rec.rooms,
      rec.capacity,
      string_to_array(rec.facilities, ',')
    )
    returning id into sid;

    insert into space_internal (space_id, authority_basis, authority_notes)
    values (
      sid, 'venue_operator',
      'Pilot seed data: authority recorded as venue operator pending real provider onboarding.'
    );

    insert into listings (space_id, title, price_mwk, deposit_mwk, billing_period,
                          available_from, status, published_at, featured_until)
    values (
      sid,
      rec.title,
      rec.price_mwk,
      rec.deposit_mwk,
      rec.billing_period::billing_period,
      rec.available_from::date,
      'published',
      now(),
      case when rec.featured then now() + interval '30 days' end
    )
    returning id into lid;

    if rec.verified then
      insert into verifications (listing_id, status, verified_at, reverify_by, checklist)
      values (
        lid, 'approved', now(), (current_date + interval '90 days')::date,
        '{"space_exists": true, "photos_match": true, "facilities_checked": true, "price_confirmed": true, "authority_evidence_seen": true}'::jsonb
      );
    end if;
  end loop;
end $$;
