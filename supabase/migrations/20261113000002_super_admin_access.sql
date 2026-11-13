-- super_admin is a superset of admin: every RLS policy that calls is_admin()
-- must admit super admins too. Super-admin-only actions (creating admin
-- accounts, changing roles) are enforced in the API layer (lib/adminGate.ts).
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

-- Bootstrap the first super admin. lock_profile_columns() only reverts
-- updates when auth.role() is set to something other than service_role, so
-- this runs fine from a migration / the SQL editor.
update profiles set role = 'super_admin' where email = 'admin@marcstrat.com';
