-- AI Scope v1 — M4: referrals + admin panel foundations

-- ---------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------
create table referrals (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references profiles(id) on delete cascade,
  referee_id      uuid not null references profiles(id) on delete cascade,
  code            text not null,
  status          referral_status not null default 'pending',
  referrer_reward int not null default 0,
  referee_reward  int not null default 0,
  qualified_at    timestamptz,
  rewarded_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (referrer_id, referee_id)
);

alter table referrals enable row level security;
create policy "read own referrals" on referrals for select
  using (referrer_id = auth.uid() or referee_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- qualify_referral — called after a referee's scan completes. No-ops if
-- there's no pending referral for this user (already rewarded, or was
-- never referred), so it's safe to call unconditionally on every scan
-- completion rather than tracking "is this their first scan" separately.
-- ---------------------------------------------------------------------
create or replace function qualify_referral(p_referee_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r referrals%rowtype;
begin
  select * into r from referrals where referee_id = p_referee_id and status = 'pending';
  if not found then return; end if;

  update referrals set status = 'rewarded', qualified_at = now(), rewarded_at = now()
    where id = r.id;

  perform grant_credits(r.referrer_id, r.referrer_reward, 'referral_bonus_referrer',
                        r.id, 'refbonus_referrer:'||r.id);
  perform grant_credits(r.referee_id, r.referee_reward, 'referral_bonus_referee',
                        r.id, 'refbonus_referee:'||r.id);
end;
$$;

-- ---------------------------------------------------------------------
-- handle_new_user — re-defined to also open a pending referral when the
-- new user's ref code resolves to a real referrer. Everything else is
-- unchanged from the M1 version.
-- ---------------------------------------------------------------------
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
      values (v_referrer.id, new.id, v_ref, 25, 25)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- redeem_invite — re-defined to also open the pending referral for
-- someone who signed up (with a ref code) before they had an invite, and
-- is only now activating. handle_new_user only opens the referral at
-- signup time when the account goes straight to 'active'; this covers
-- the delayed-activation path so the referrer isn't shortchanged.
-- ---------------------------------------------------------------------
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
    select v_profile.referred_by, p_user_id, referral_code, 25, 25
    from profiles where id = v_profile.referred_by
    on conflict do nothing;
  end if;

  return 'active';
end;
$$;

-- ---------------------------------------------------------------------
-- Lock down direct RPC access. grant_credits/spend_credits/redeem_invite/
-- qualify_referral are SECURITY DEFINER and, until now, had no internal
-- caller check — PostgREST exposes every public-schema function to the
-- anon/authenticated roles by default, so any signed-in user could have
-- called e.g. grant_credits(self, 999999, 'admin_adjustment', ...) directly
-- via supabase.rpc(). All four are only ever invoked server-side (via the
-- service-role client in lib/credits.ts, lib/scans.ts, lib/referrals.ts,
-- and app/api/invites/redeem) — revoke public/client access entirely.
revoke execute on function grant_credits(uuid, int, credit_txn_type, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function spend_credits(uuid, int, credit_txn_type, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function redeem_invite(uuid, text) from public, anon, authenticated;
revoke execute on function qualify_referral(uuid) from public, anon, authenticated;

grant execute on function grant_credits(uuid, int, credit_txn_type, uuid, text, uuid, jsonb) to service_role;
grant execute on function spend_credits(uuid, int, credit_txn_type, uuid, text, jsonb) to service_role;
grant execute on function redeem_invite(uuid, text) to service_role;
grant execute on function qualify_referral(uuid) to service_role;
