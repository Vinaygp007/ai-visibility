-- AI Scope v1 — M5: bug reports, rate limiting, referral-event signal

-- ---------------------------------------------------------------------
-- bug_reports (spec §4.8/§12) — the in-app widget posts here via a
-- service-role route, but "insert own" is still granted so a future
-- direct-from-client path doesn't need a schema change.
-- ---------------------------------------------------------------------
create table bug_reports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles(id) on delete set null,
  title          text not null,
  description    text not null,
  severity       bug_severity not null default 'medium',
  status         bug_status  not null default 'new',
  url            text,
  user_agent     text,
  screenshot_url text,
  console_logs   jsonb,
  app_version    text,
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

alter table bug_reports enable row level security;
create policy "read own bugs" on bug_reports for select using (user_id = auth.uid() or is_admin());
create policy "insert own bugs" on bug_reports for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- rate_limit_events — sliding-window counter for /api/analyze, /api/bulk,
-- /api/prompt-run, /api/invites/redeem, /api/waitlist. Service-role only,
-- same as the credit tables — no client policies.
-- ---------------------------------------------------------------------
create table rate_limit_events (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null,
  created_at timestamptz not null default now()
);

create index on rate_limit_events (bucket, created_at desc);

alter table rate_limit_events enable row level security;

-- ---------------------------------------------------------------------
-- qualify_referral now returns whether it actually fired, so the calling
-- route can emit a referral_qualified analytics event only when true
-- instead of on every scan completion (drop+recreate: Postgres won't let
-- CREATE OR REPLACE change a function's return type).
-- ---------------------------------------------------------------------
drop function if exists qualify_referral(uuid);

create function qualify_referral(p_referee_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare r referrals%rowtype;
begin
  select * into r from referrals where referee_id = p_referee_id and status = 'pending';
  if not found then return false; end if;

  update referrals set status = 'rewarded', qualified_at = now(), rewarded_at = now()
    where id = r.id;

  perform grant_credits(r.referrer_id, r.referrer_reward, 'referral_bonus_referrer',
                        r.id, 'refbonus_referrer:'||r.id);
  perform grant_credits(r.referee_id, r.referee_reward, 'referral_bonus_referee',
                        r.id, 'refbonus_referee:'||r.id);
  return true;
end;
$$;

revoke execute on function qualify_referral(uuid) from public, anon, authenticated;
grant execute on function qualify_referral(uuid) to service_role;
