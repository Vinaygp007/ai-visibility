-- Stripe subscription billing. Wires the (already-built) plan/credit model
-- in profiles + credit_ledger up to real payments — see lib/stripe/* and
-- app/api/checkout, app/api/webhooks/stripe for the app-side half.

alter type credit_txn_type add value 'subscription_grant';

alter table profiles
  add column stripe_customer_id     text unique,
  add column stripe_subscription_id text,
  add column subscription_status    text,
  add column current_period_end     timestamptz;

-- Extends the plan-lock trigger from 20260727000002_plan_gating.sql to also
-- guard the new billing columns — same reasoning as the original: the
-- "update own profile" RLS policy has no WITH CHECK, so a signed-in user's
-- own client could otherwise overwrite their stripe_customer_id to someone
-- else's, or fake subscription_status, via a direct PostgREST call. Only
-- the service-role client (the webhook handler) may write these.
create or replace function lock_profile_plan()
returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    if new.plan is distinct from old.plan then
      new.plan := old.plan;
    end if;
    if new.stripe_customer_id is distinct from old.stripe_customer_id then
      new.stripe_customer_id := old.stripe_customer_id;
    end if;
    if new.stripe_subscription_id is distinct from old.stripe_subscription_id then
      new.stripe_subscription_id := old.stripe_subscription_id;
    end if;
    if new.subscription_status is distinct from old.subscription_status then
      new.subscription_status := old.subscription_status;
    end if;
    if new.current_period_end is distinct from old.current_period_end then
      new.current_period_end := old.current_period_end;
    end if;
  end if;
  return new;
end;
$$;
