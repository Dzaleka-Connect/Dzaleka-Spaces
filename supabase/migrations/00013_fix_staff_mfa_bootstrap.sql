-- Fix the staff MFA bootstrap lockout introduced by 00010.
--
-- 00010 added a RESTRICTIVE "for all" policy requiring staff_mfa_satisfied()
-- on a list of sensitive tables. Two entries in that list are load-bearing for
-- rendering the app itself, so a staff account that had not yet enrolled in
-- MFA (aal1) was silently demoted:
--
--   * user_roles  — the app derives "am I staff?" from this table. With the
--     rows hidden, roles came back empty: the Admin/Verifier navigation
--     disappeared, and the account-security panel only offers MFA enrolment
--     when it can see a staff role. The user could neither reach the portal
--     nor enrol in the MFA that would let them reach it.
--   * feature_flags — already world-readable (anon holds select), so requiring
--     MFA to READ them protected nothing and blanked the flag-gated navigation.
--
-- Reading your own role, and reading public flag values, are not sensitive.
-- MFA still gates every write here, reading *other* users' roles, and every
-- other table 00010 listed (space_internal, audit_events, payments, ...).

-- ---------------------------------------------------------------------------
-- user_roles: self-read is always allowed; everything else still needs MFA.
-- ---------------------------------------------------------------------------

drop policy if exists "staff mfa required user_roles" on user_roles;

create policy "staff mfa required user_roles select" on user_roles
  as restrictive for select to authenticated
  using (staff_mfa_satisfied() or user_id = (select auth.uid()));

create policy "staff mfa required user_roles insert" on user_roles
  as restrictive for insert to authenticated
  with check (staff_mfa_satisfied());

create policy "staff mfa required user_roles update" on user_roles
  as restrictive for update to authenticated
  using (staff_mfa_satisfied())
  with check (staff_mfa_satisfied());

create policy "staff mfa required user_roles delete" on user_roles
  as restrictive for delete to authenticated
  using (staff_mfa_satisfied());

-- ---------------------------------------------------------------------------
-- feature_flags: reads are public; only writes require MFA.
-- ---------------------------------------------------------------------------

drop policy if exists "staff mfa required feature_flags" on feature_flags;

create policy "staff mfa required feature_flags update" on feature_flags
  as restrictive for update to authenticated
  using (staff_mfa_satisfied())
  with check (staff_mfa_satisfied());
