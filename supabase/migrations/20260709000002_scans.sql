-- AI Scope v1 — M2: provider config, scans, scan_results, bulk_jobs

-- ---------------------------------------------------------------------
-- provider_config — singleton row, admin-editable enable/model/prompt
-- toggles. No API keys here (those live in server env vars per the M2
-- decision) — only what app/settings/page.tsx needs to control.
-- ---------------------------------------------------------------------
create table provider_config (
  id         boolean primary key default true,
  providers  jsonb not null default '[]',
  prompts    jsonb not null default '{}',
  features   jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  constraint provider_config_singleton check (id)
);

alter table provider_config enable row level security;
create policy "admin provider_config" on provider_config for all using (is_admin());

-- ---------------------------------------------------------------------
-- bulk_jobs — job-level progress tracking for the bulk scanner /
-- prompt-run batch UIs (SSE progress). Not part of the spec's schema;
-- the existing app needs it for the live progress table.
-- ---------------------------------------------------------------------
create table bulk_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  kind         text not null check (kind in ('bulk_audit', 'bulk_prompt')),
  status       scan_status not null default 'queued',
  total        int not null default 0,
  completed    int not null default 0,
  failed       int not null default 0,
  skipped      int not null default 0,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index on bulk_jobs (user_id, created_at desc);

alter table bulk_jobs enable row level security;
create policy "read own bulk_jobs" on bulk_jobs for select using (user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- scans — one row per billable scan attempt (homepage audit, one item
-- in a bulk batch, or one prompt-run execution). `result` holds the
-- existing AnalysisResult / runRecord JSON verbatim so the current UI
-- (ReportModal, PromptResponsePanel, CitationsPanel, ReportsHistory,
-- CSV/PDF export) keeps working unchanged.
-- ---------------------------------------------------------------------
create table scans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  kind             text not null check (kind in ('audit', 'bulk_item', 'prompt_run')),
  bulk_job_id      uuid references bulk_jobs(id) on delete cascade,
  url              text,
  brand            text,
  queries          jsonb,
  engines          jsonb,
  status           scan_status not null default 'queued',
  credits_cost     int not null default 0,
  ledger_debit_id  uuid references credit_ledger(id),
  visibility_score numeric,
  cache_key        text,
  result           jsonb,
  error            text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index on scans (user_id, created_at desc);
create index on scans (cache_key, created_at desc);
create index on scans (bulk_job_id);
create index on scans (status);

alter table scans enable row level security;
create policy "read own scans" on scans for select using (user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- scan_results — one row per engine×query, populated from the same
-- per-provider objects the analyze/prompt-run routes already compute
-- (ProviderMeta / CitationResult) — additive, not a new computation.
-- ---------------------------------------------------------------------
create table scan_results (
  id           uuid primary key default gen_random_uuid(),
  scan_id      uuid not null references scans(id) on delete cascade,
  engine       text not null,
  query        text not null,
  mentioned    boolean not null default false,
  position     int,
  sentiment    text,
  raw_response text,
  citations    jsonb,
  created_at   timestamptz not null default now()
);

create index on scan_results (scan_id);

alter table scan_results enable row level security;
create policy "read own scan_results" on scan_results for select
  using (exists (select 1 from scans s where s.id = scan_id and (s.user_id = auth.uid() or is_admin())));

-- Writes to scans/scan_results/bulk_jobs/provider_config all go through
-- the service-role client from server-side route handlers (lib/scans.ts,
-- lib/providerConfig.ts) — no client-side insert/update policies are
-- defined on purpose, matching the spec's golden rule in §3.
