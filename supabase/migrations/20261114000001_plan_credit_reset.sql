-- Monthly plan credits reset instead of piling up, and yearly subscribers get
-- their credits every month instead of once a year.
--
-- credit_balances.balance stays the single spendable total. plan_credits is
-- the part of it that came from the current subscription period and expires
-- at the next grant; everything else (signup, referral, admin, top-up
-- purchases) never expires. Spending draws plan credits first.
--
-- Existing balances start with plan_credits = 0, so credits already granted
-- before this migration are kept as non-expiring.

alter type credit_txn_type add value if not exists 'plan_expiry';

alter table credit_balances
  add column plan_credits       int not null default 0 check (plan_credits >= 0),
  add column next_plan_grant_at timestamptz;

alter table credit_balances
  add constraint plan_credits_within_balance check (plan_credits <= balance);

-- Due-date scan for the monthly yearly-plan grant job.
create index credit_balances_next_plan_grant_at_idx
  on credit_balances (next_plan_grant_at)
  where next_plan_grant_at is not null;

-- ---------------------------------------------------------------------
-- spend_credits: plan credits first; records how much came from the plan
-- bucket so a refund can put it back where it came from.
-- ---------------------------------------------------------------------
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
  v_plan int;
  v_plan_part int;
  v_new_balance int;
begin
  if p_amount <= 0 then raise exception 'spend amount must be positive'; end if;

  if p_idempotency_key is not null
     and exists (select 1 from credit_ledger where idempotency_key = p_idempotency_key) then
    return (select balance from credit_balances where user_id = p_user_id);
  end if;

  select balance, plan_credits into v_balance, v_plan from credit_balances
    where user_id = p_user_id for update;

  if v_balance is null or v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  v_plan_part := least(v_plan, p_amount);

  update credit_balances
    set balance = balance - p_amount,
        plan_credits = plan_credits - v_plan_part,
        updated_at = now()
    where user_id = p_user_id
    returning balance into v_new_balance;

  insert into credit_ledger (user_id, amount, balance_after, type, reference_id,
                             idempotency_key, metadata)
    values (p_user_id, -p_amount, v_new_balance, p_type, p_reference_id,
            p_idempotency_key,
            coalesce(p_metadata, '{}') || jsonb_build_object('plan_part', v_plan_part));

  return v_new_balance;
end;
$$;

-- ---------------------------------------------------------------------
-- grant_credits: unchanged for every grant type except scan_refund, which
-- returns the plan-bucket share of the original debit to the plan bucket
-- (so refunding a failed scan doesn't turn expiring credits into permanent
-- ones).
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
  v_plan_back int := 0;
begin
  if p_amount <= 0 then raise exception 'grant amount must be positive'; end if;

  if p_idempotency_key is not null
     and exists (select 1 from credit_ledger where idempotency_key = p_idempotency_key) then
    return (select balance from credit_balances where user_id = p_user_id);
  end if;

  if p_type = 'scan_refund' and p_reference_id is not null then
    select coalesce(sum((metadata->>'plan_part')::int), 0) into v_plan_back
      from credit_ledger
     where user_id = p_user_id
       and reference_id = p_reference_id
       and type = 'scan_debit';
    v_plan_back := least(greatest(v_plan_back, 0), p_amount);
  end if;

  insert into credit_balances (user_id, balance, plan_credits)
    values (p_user_id, p_amount, v_plan_back)
  on conflict (user_id) do update
    set balance = credit_balances.balance + p_amount,
        plan_credits = credit_balances.plan_credits + v_plan_back,
        updated_at = now()
  returning balance into v_new_balance;

  insert into credit_ledger (user_id, amount, balance_after, type, reference_id,
                             idempotency_key, created_by, metadata)
    values (p_user_id, p_amount, v_new_balance, p_type, p_reference_id,
            p_idempotency_key, p_created_by, p_metadata);

  return v_new_balance;
end;
$$;

-- ---------------------------------------------------------------------
-- reset_plan_credits: start a new plan period. Unused plan credits from the
-- previous period expire, p_amount new plan credits are granted (0 on
-- cancellation), and next_plan_grant_at schedules the next monthly grant
-- for yearly plans (null for monthly plans, whose renewals come from Stripe
-- invoices).
-- ---------------------------------------------------------------------
create or replace function reset_plan_credits(
  p_user_id uuid,
  p_amount  int,
  p_idempotency_key text,
  p_next_grant_at timestamptz default null,
  p_metadata jsonb default '{}'
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_expired int;
  v_balance int;
begin
  if p_amount < 0 then raise exception 'plan grant must not be negative'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required'; end if;

  if exists (select 1 from credit_ledger
              where idempotency_key in (p_idempotency_key, p_idempotency_key || ':expiry')) then
    return (select balance from credit_balances where user_id = p_user_id);
  end if;

  insert into credit_balances (user_id, balance, plan_credits)
    values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  select plan_credits into v_expired from credit_balances
    where user_id = p_user_id for update;

  update credit_balances
    set balance = balance - v_expired + p_amount,
        plan_credits = p_amount,
        next_plan_grant_at = p_next_grant_at,
        updated_at = now()
    where user_id = p_user_id
    returning balance into v_balance;

  if v_expired > 0 then
    insert into credit_ledger (user_id, amount, balance_after, type, idempotency_key, metadata)
      values (p_user_id, -v_expired, v_balance - p_amount, 'plan_expiry',
              p_idempotency_key || ':expiry', p_metadata);
  end if;

  if p_amount > 0 then
    insert into credit_ledger (user_id, amount, balance_after, type, idempotency_key, metadata)
      values (p_user_id, p_amount, v_balance, 'subscription_grant',
              p_idempotency_key, p_metadata);
  end if;

  return v_balance;
end;
$$;

revoke execute on function reset_plan_credits(uuid, int, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function reset_plan_credits(uuid, int, text, timestamptz, jsonb) to service_role;
