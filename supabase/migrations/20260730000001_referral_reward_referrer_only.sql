-- Referral reward change: referrer-only, 10 credits.
-- Previously both sides got 25 credits when a referral qualified. Now only
-- the referrer is rewarded (10 credits) — the referee still gets their
-- normal signup_grant, just no separate referral bonus on top of it.
--
-- Existing 'pending' referrals already carry their original 25/25 reward
-- values on the row itself (set at insert time), so they'll still pay out
-- under the old terms when they qualify — only newly created referrals use
-- the new 10/0 split. That's intentional: don't change the deal for
-- referrals already in flight.

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
    perform grant_credits(new.id, 50, 'signup_grant', null, 'signup:'||new.id);

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

  perform grant_credits(p_user_id, 50, 'signup_grant', null, 'signup:'||p_user_id);

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

-- grant_credits() raises if called with amount <= 0, so qualify_referral now
-- guards each side independently instead of always granting both — a
-- referee_reward of 0 must not attempt (and abort) a zero-amount grant.
--
-- The live function actually returns boolean (lib/referrals.ts checks
-- `data === true` to decide whether to fire a `referral_qualified` analytics
-- event) even though the original migration's source said `returns void` —
-- drift between what got hand-applied and what's in the repo. Postgres
-- won't let CREATE OR REPLACE change a function's return type, so drop it
-- first and recreate matching the real (boolean) signature.
drop function if exists qualify_referral(uuid);

create function qualify_referral(p_referee_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare r referrals%rowtype;
begin
  select * into r from referrals where referee_id = p_referee_id and status = 'pending';
  if not found then return false; end if;

  update referrals set status = 'rewarded', qualified_at = now(), rewarded_at = now()
    where id = r.id;

  if r.referrer_reward > 0 then
    perform grant_credits(r.referrer_id, r.referrer_reward, 'referral_bonus_referrer',
                          r.id, 'refbonus_referrer:'||r.id);
  end if;

  if r.referee_reward > 0 then
    perform grant_credits(r.referee_id, r.referee_reward, 'referral_bonus_referee',
                          r.id, 'refbonus_referee:'||r.id);
  end if;

  return true;
end;
$$;

revoke execute on function qualify_referral(uuid) from public, anon, authenticated;
grant execute on function qualify_referral(uuid) to service_role;
