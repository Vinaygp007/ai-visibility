-- AI Scope v1 — v2 feature vote: bulk scanner vs. prompt runner.
-- v1 ships with Scan only; Bulk/Prompt stay admin-only (see app/bulk and
-- app/bulk-prompt layouts) until users vote on which one ships in v2.

create type feature_vote_page as enum ('bulk', 'prompt');

-- ---------------------------------------------------------------------
-- feature_votes — one row per user (unique user_id) and never updated:
-- a vote is final once cast, so POST /api/votes does a plain insert and
-- relies on this constraint to reject a second attempt.
-- ---------------------------------------------------------------------
create table feature_votes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references profiles(id) on delete cascade,
  page       feature_vote_page not null,
  created_at timestamptz not null default now()
);

create index on feature_votes (page);

alter table feature_votes enable row level security;
create policy "read own vote" on feature_votes for select using (user_id = auth.uid() or is_admin());

-- Writes go through the service-role client from app/api/votes (same
-- convention as scans/bulk_jobs/provider_config) — no client-side
-- insert/update policy needed.

-- ---------------------------------------------------------------------
-- get_feature_vote_counts — tallies are shown to every voter so they can
-- see how the vote is trending, but feature_votes' RLS only exposes a
-- user's own row. This is the one thing worth exposing beyond that: an
-- aggregate with no user_id in it.
-- ---------------------------------------------------------------------
create or replace function get_feature_vote_counts()
returns table(page feature_vote_page, votes bigint)
language sql stable security definer set search_path = public as $$
  select page, count(*) as votes from feature_votes group by page;
$$;

grant execute on function get_feature_vote_counts() to authenticated;
