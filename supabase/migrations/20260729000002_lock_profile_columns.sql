-- Supersedes lock_profile_plan (20260727000002) and
-- lock_profile_privileged_columns (20260729000001).
--
-- Both of those were reactive, per-column patches on top of "update own
-- profile" (20260709000001_init.sql), which has no WITH CHECK and so lets a
-- user's own client write ANY column on their own row via PostgREST. Each
-- new sensitive column added to `profiles` needed its own follow-up
-- migration to lock it down — `plan` first, then `role`/`status` — and an
-- audit turned up two more that were still open: `email` (redeem_invite
-- matches invites by email, so a spoofed email can redeem someone else's
-- reserved invite) and `referred_by` (freely settable while an account is
-- still pending, letting a user route a referral bonus to an arbitrary
-- account without ever using that person's actual invite link).
--
-- There is currently no code path anywhere in the app that updates a
-- profiles row from the client at all — every legitimate write (admin user
-- edits, invite redemption, referral bonuses, credit grants) goes through
-- lib/supabase/admin.ts's service-role client. So instead of continuing to
-- chase individual columns, this locks the row down entirely: any UPDATE
-- not made with the service-role key is reverted in full. If a genuine
-- self-service profile edit (e.g. changing full_name/avatar_url from a
-- settings page) is added later, allow those specific columns then, against
-- the feature that actually needs them.

drop trigger if exists profiles_lock_plan on profiles;
drop trigger if exists profiles_lock_role_status on profiles;
drop function if exists lock_profile_plan();
drop function if exists lock_profile_privileged_columns();

create or replace function lock_profile_columns()
returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_columns on profiles;

create trigger profiles_lock_columns
before update on profiles
for each row execute function lock_profile_columns();
