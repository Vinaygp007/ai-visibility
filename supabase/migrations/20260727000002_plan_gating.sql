-- Adds a `plan` column to profiles so PDF export can gate watermarking /
-- white-labeling by tier (see components/PricingSection.tsx for the
-- Free/Starter/Growth/Agency/Scale lineup). There's no billing integration
-- yet, so plan changes are admin-only via app/api/admin/users (PATCH),
-- which updates through the service-role client.
--
-- The existing "update own profile" policy (20260709000001_init.sql) has no
-- WITH CHECK, so a signed-in user's own client could otherwise write any
-- column on their own row directly via PostgREST — including a newly added
-- `plan` column, which would let them grant themselves Agency/Scale for
-- free. The trigger below closes that specific hole by silently reverting
-- any change to `plan` that didn't come from the service-role connection,
-- without touching the (separate, pre-existing) exposure on other columns.

create type user_plan as enum ('free', 'starter', 'growth', 'agency', 'scale');

alter table profiles add column plan user_plan not null default 'free';

create or replace function lock_profile_plan()
returns trigger
language plpgsql as $$
begin
  if new.plan is distinct from old.plan and auth.role() <> 'service_role' then
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

create trigger profiles_lock_plan
before update on profiles
for each row execute function lock_profile_plan();
