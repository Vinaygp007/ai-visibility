-- referrals.referrer_id / referee_id were `on delete cascade`, so deleting
-- either party's account (e.g. cleaning up a test/orphaned signup) silently
-- destroyed the referral row along with it — including its `rewarded`
-- status and the fact that credits were already paid out. The credits stay
-- in credit_ledger either way; only the row explaining them was vanishing.
--
-- Switch to `on delete set null` so a referral's history (status, rewards,
-- timestamps) survives even after one side's account is later deleted.
-- Requires making both columns nullable first.
do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
    from pg_constraint
    where conrelid = 'referrals'::regclass
      and contype = 'f'
      and conkey = (select array_agg(attnum) from pg_attribute
                    where attrelid = 'referrals'::regclass and attname = 'referrer_id');
  if v_constraint is not null then
    execute format('alter table referrals drop constraint %I', v_constraint);
  end if;

  select conname into v_constraint
    from pg_constraint
    where conrelid = 'referrals'::regclass
      and contype = 'f'
      and conkey = (select array_agg(attnum) from pg_attribute
                    where attrelid = 'referrals'::regclass and attname = 'referee_id');
  if v_constraint is not null then
    execute format('alter table referrals drop constraint %I', v_constraint);
  end if;
end $$;

alter table referrals alter column referrer_id drop not null;
alter table referrals alter column referee_id drop not null;

alter table referrals
  add constraint referrals_referrer_id_fkey
  foreign key (referrer_id) references profiles(id) on delete set null;

alter table referrals
  add constraint referrals_referee_id_fkey
  foreign key (referee_id) references profiles(id) on delete set null;
