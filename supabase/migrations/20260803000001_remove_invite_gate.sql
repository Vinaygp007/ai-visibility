-- Removes the invite/waitlist gate: every new signup (password or Google
-- OAuth) now lands as 'active' immediately instead of 'pending' pending an
-- invite code. The `invites` and `waitlist` tables are left in place
-- (unused going forward, no destructive DROP) in case historical data is
-- still wanted; only the gating behavior in handle_new_user() changes.

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ref  text := coalesce(new.raw_user_meta_data->>'ref', '');
  v_referrer profiles%rowtype;
  v_referral_code text := substr(md5(new.id::text), 1, 8);
begin
  if v_ref <> '' then
    select * into v_referrer from profiles where referral_code = v_ref;
  end if;

  insert into profiles (id, email, full_name, avatar_url, status,
                        referral_code, referred_by)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url',
          'active', v_referral_code,
          case when v_referrer.id <> new.id then v_referrer.id end);

  insert into credit_balances (user_id, balance) values (new.id, 0);

  perform grant_credits(new.id, 20, 'signup_grant', null, 'signup:'||new.id);

  if v_referrer.id is not null and v_referrer.id <> new.id then
    insert into referrals (referrer_id, referee_id, code, referrer_reward, referee_reward)
    values (v_referrer.id, new.id, v_ref, 10, 0)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- One-time backfill: activate anyone stuck 'pending' from the old
-- invite/waitlist flow and give them the same signup grant a fresh signup
-- gets today. Idempotency key matches handle_new_user's convention, so this
-- migration is safe to re-run.
do $$
declare
  r profiles%rowtype;
begin
  for r in select * from profiles where status = 'pending' loop
    update profiles set status = 'active' where id = r.id;
    perform grant_credits(r.id, 20, 'signup_grant', null, 'signup:'||r.id);
  end loop;
end;
$$;
