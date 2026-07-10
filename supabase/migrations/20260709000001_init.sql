-- AI Scope v1 — M1: identity, invites, waitlist, credit ledger
-- Enums are declared up front (including ones only used by later milestones)
-- so downstream migrations never need to ALTER TYPE.

create type user_role      as enum ('user', 'admin');
create type account_status as enum ('pending', 'active', 'suspended');

create type invite_status   as enum ('active', 'exhausted', 'revoked', 'expired');
create type waitlist_status as enum ('pending', 'invited', 'rejected');

create type credit_txn_type as enum (
  'signup_grant',
  'magic_link_grant',
  'referral_bonus_referrer',
  'referral_bonus_referee',
  'admin_adjustment',
  'scan_debit',
  'scan_refund',
  'purchase'
);

create type referral_status as enum ('pending', 'qualified', 'rewarded', 'void');
create type scan_status     as enum ('queued', 'running', 'completed', 'failed');
create type bug_status      as enum ('new', 'triage', 'in_progress', 'resolved', 'wontfix');
create type bug_severity    as enum ('low', 'medium', 'high', 'critical');

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  role          user_role      not null default 'user',
  status        account_status not null default 'pending',
  referral_code text unique not null,
  referred_by   uuid references profiles(id),
  invite_id     uuid,
  created_at    timestamptz not null default now()
);

create index on profiles (referred_by);
create index on profiles (referral_code);

-- ---------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------
create table invites (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  email            text,
  credits_granted  int not null default 0,
  max_uses         int not null default 1,
  uses             int not null default 0,
  status           invite_status not null default 'active',
  created_by       uuid references profiles(id),
  expires_at       timestamptz,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index on invites (email);
create index on invites (status);

-- ---------------------------------------------------------------------
-- waitlist
-- ---------------------------------------------------------------------
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  full_name  text,
  company    text,
  source     text,
  status     waitlist_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- credit ledger + balances
-- ---------------------------------------------------------------------
create table credit_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  amount          int not null,
  balance_after   int not null,
  type            credit_txn_type not null,
  reference_id    uuid,
  idempotency_key text,
  metadata        jsonb not null default '{}',
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  unique (idempotency_key)
);

create index on credit_ledger (user_id, created_at desc);
create index on credit_ledger (type);

create table credit_balances (
  user_id    uuid primary key references profiles(id) on delete cascade,
  balance    int  not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- audit log (admin actions)
-- ---------------------------------------------------------------------
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

alter table profiles         enable row level security;
alter table credit_ledger    enable row level security;
alter table credit_balances  enable row level security;
alter table invites          enable row level security;
alter table waitlist         enable row level security;
alter table audit_log        enable row level security;

create policy "read own profile"   on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid());

create policy "read own balance" on credit_balances for select using (user_id = auth.uid() or is_admin());
create policy "read own ledger"  on credit_ledger  for select using (user_id = auth.uid() or is_admin());

create policy "admin invites"  on invites  for all    using (is_admin());
create policy "admin waitlist" on waitlist for select using (is_admin());
create policy "admin audit"    on audit_log for select using (is_admin());

-- Waitlist signups come in through a server route using the service-role
-- client (app/api/waitlist), not a direct client insert — no open insert
-- policy on waitlist is defined here on purpose.

-- ---------------------------------------------------------------------
-- grant / spend RPCs
-- ---------------------------------------------------------------------
create or replace function grant_credits(
  p_user_id uuid,
  p_amount  int,
  p_type    credit_txn_type,
  p_reference_id uuid default null,
  p_idempotency_key text default null,
  p_created_by uuid default null,
  p_metadata jsonb default '{}'
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_new_balance int;
begin
  if p_amount <= 0 then raise exception 'grant amount must be positive'; end if;

  if p_idempotency_key is not null
     and exists (select 1 from credit_ledger where idempotency_key = p_idempotency_key) then
    return (select balance from credit_balances where user_id = p_user_id);
  end if;

  insert into credit_balances (user_id, balance)
    values (p_user_id, p_amount)
  on conflict (user_id) do update
    set balance = credit_balances.balance + p_amount, updated_at = now()
  returning balance into v_new_balance;

  insert into credit_ledger (user_id, amount, balance_after, type, reference_id,
                             idempotency_key, created_by, metadata)
    values (p_user_id, p_amount, v_new_balance, p_type, p_reference_id,
            p_idempotency_key, p_created_by, p_metadata);

  return v_new_balance;
end;
$$;

create or replace function spend_credits(
  p_user_id uuid,
  p_amount  int,
  p_type    credit_txn_type,
  p_reference_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_balance int;
  v_new_balance int;
begin
  if p_amount <= 0 then raise exception 'spend amount must be positive'; end if;

  if p_idempotency_key is not null
     and exists (select 1 from credit_ledger where idempotency_key = p_idempotency_key) then
    return (select balance from credit_balances where user_id = p_user_id);
  end if;

  select balance into v_balance from credit_balances
    where user_id = p_user_id for update;

  if v_balance is null or v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  update credit_balances
    set balance = balance - p_amount, updated_at = now()
    where user_id = p_user_id
    returning balance into v_new_balance;

  insert into credit_ledger (user_id, amount, balance_after, type, reference_id,
                             idempotency_key, metadata)
    values (p_user_id, -p_amount, v_new_balance, p_type, p_reference_id,
            p_idempotency_key, p_metadata);

  return v_new_balance;
end;
$$;

-- ---------------------------------------------------------------------
-- invite-gate trigger on new auth user
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

    -- referrals table lands in a later migration; the pending-referral insert
    -- moves there once that table exists (see 20260709000004_referrals.sql).
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- self-serve invite redemption for an already-existing (pending) profile
-- ---------------------------------------------------------------------
-- Covers the case where someone signed up (or joined via waitlist) before
-- they had a code, then later receives one — lets them activate without a
-- second signup. Called from app/api/invites/redeem via the service-role
-- client, after that route has independently verified the caller's session.
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

  return 'active';
end;
$$;
