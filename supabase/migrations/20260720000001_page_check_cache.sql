-- Shared cache for /api/crawl and /api/pagespeed. Both routes are
-- unauthenticated and free (no AI cost), but they were re-running in full
-- on every report view with no caching at all — real exposure against
-- Google's shared PageSpeed Insights quota and outbound crawl bandwidth
-- once bulk-scan volume ramps. Keyed by url (not user_id): unlike `scans`,
-- there's no reason two different users checking the same URL within the
-- TTL window should pay for two separate crawls/PSI runs.

create table page_check_cache (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('crawl', 'pagespeed')),
  url        text not null,
  result     jsonb not null,
  created_at timestamptz not null default now()
);

create unique index on page_check_cache (kind, url);
create index on page_check_cache (created_at);

alter table page_check_cache enable row level security;
-- No client policies on purpose, matching scans/scan_results/bulk_jobs —
-- all reads/writes go through the service-role client in lib/pageCache.ts.
