-- Fixes a regression introduced by 20260730000001_referral_reward_referrer_only.sql:
-- that migration redefined handle_new_user() and redeem_invite() by copying
-- the body from 20260709000004_referrals.sql, missing that
-- 20260727000001_free_signup_credits.sql had already lowered the signup
-- grant from 50 to 20 in between. This restores the 20-credit signup grant
-- while keeping the referrer-only 10-credit referral reward from
-- 20260730000001.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_invite invites%rowtype;
  v_code text := coalesce(new.raw_user_meta_data->>'invite_code', '');
  v_ref  text := coalesce(new.raw_user_meta_data->>'ref', '');
  v_referrer profiles%rowtype;
  v_status account_status := 'pending';
  v_referral_code text := substr(md5(new.id::text), 1, 8);
begin
  select * into v_invite from invites
   where status = 'active'
     and (expires_at is null or expires_at > now())
     and uses < max_uses
     and (code = v_code or (email is not null and lower(email) = lower(new.email)))
   order by (code = v_code) desc
   limit 1;

  if found then
    v_status := 'active';
    update invites set uses = uses + 1,
      status = case when uses + 1 >= max_uses then 'exhausted' else status end
     where id = v_invite.id;
  end if;

  if v_ref <> '' then
    select * into v_referrer from profiles where referral_code = v_ref;
  end if;

  insert into profiles (id, email, full_name, avatar_url, status,
                        referral_code, referred_by, invite_id)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url',
          v_status, v_referral_code,
          case when v_referrer.id <> new.id then v_referrer.id end,
          v_invite.id);

  insert into credit_balances (user_id, balance) values (new.id, 0);

  if v_status = 'active' then
    perform grant_credits(new.id, 20, 'signup_grant', null, 'signup:'||new.id);

    if v_invite.credits_granted > 0 then
      perform grant_credits(new.id, v_invite.credits_granted, 'magic_link_grant',
                            v_invite.id, 'invite:'||v_invite.id||':'||new.id);
    end if;

    if v_referrer.id is not null and v_referrer.id <> new.id then
      insert into referrals (referrer_id, referee_id, code, referrer_reward, referee_reward)
      values (v_referrer.id, new.id, v_ref, 10, 0)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

create or replace function redeem_invite(p_user_id uuid, p_code text)
returns account_status
language plpgsql security definer set search_path = public as $$
declare
  v_invite invites%rowtype;
  v_profile profiles%rowtype;
begin
  select * into v_profile from profiles where id = p_user_id;
  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_profile.status = 'active' then
    return v_profile.status;
  end if;

  select * into v_invite from invites
   where status = 'active'
     and (expires_at is null or expires_at > now())
     and uses < max_uses
     and (code = p_code or (email is not null and lower(email) = lower(v_profile.email)))
   order by (code = p_code) desc
   limit 1;

  if not found then
    raise exception 'invalid_invite' using errcode = 'P0002';
  end if;

  update invites set uses = uses + 1,
    status = case when uses + 1 >= max_uses then 'exhausted' else status end
   where id = v_invite.id;

  update profiles set status = 'active', invite_id = v_invite.id where id = p_user_id;

  perform grant_credits(p_user_id, 20, 'signup_grant', null, 'signup:'||p_user_id);

  if v_invite.credits_granted > 0 then
    perform grant_credits(p_user_id, v_invite.credits_granted, 'magic_link_grant',
                          v_invite.id, 'invite:'||v_invite.id||':'||p_user_id);
  end if;

  if v_profile.referred_by is not null then
    insert into referrals (referrer_id, referee_id, code, referrer_reward, referee_reward)
    select v_profile.referred_by, p_user_id, referral_code, 10, 0
    from profiles where id = v_profile.referred_by
    on conflict do nothing;
  end if;

  return 'active';
end;
$$;
