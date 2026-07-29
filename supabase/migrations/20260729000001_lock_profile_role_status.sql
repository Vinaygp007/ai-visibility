-- The "update own profile" policy (20260709000001_init.sql) has no WITH
-- CHECK, so a signed-in user's own client can write any column on their own
-- row directly via PostgREST. 20260727000002_plan_gating.sql closed that
-- hole for `plan` but explicitly left `role` and `status` open — those are
-- the two columns that actually gate admin access (lib/adminGate.ts) and
-- the invite/waitlist wall (middleware.ts), so leaving them writable lets
-- any authenticated user self-promote to admin or self-activate past the
-- invite gate with a single direct `supabase.from('profiles').update(...)`
-- call. This trigger silently reverts any change to `role` or `status` that
-- didn't come from the service-role connection, mirroring lock_profile_plan.

create or replace function lock_profile_privileged_columns()
returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    if new.role is distinct from old.role then
      new.role := old.role;
    end if;
    if new.status is distinct from old.status then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_lock_role_status
before update on profiles
for each row execute function lock_profile_privileged_columns();
