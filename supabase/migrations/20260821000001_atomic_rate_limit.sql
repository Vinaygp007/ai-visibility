-- checkRateLimit() (lib/rateLimit.ts) used to run a SELECT count then a
-- separate INSERT from the app. Two requests hitting the same bucket at
-- the same moment could both read "under limit" before either one's INSERT
-- landed, letting more than `limit` through per window — worst exactly
-- when concurrency is highest, which is the scenario the per-user limiter
-- and the provider-quota gate (waitForProviderSlot, added for /api/analyze
-- under concurrent load) both exist to protect against. This folds the
-- check-and-record into one atomic, per-bucket-serialized call.
create or replace function check_and_record_rate_limit(
  p_bucket text,
  p_limit int,
  p_window_ms bigint
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  -- Serializes concurrent calls for the SAME bucket only — unrelated
  -- buckets (different providers, different users) never block each
  -- other. Transaction-scoped, so it releases automatically on return.
  perform pg_advisory_xact_lock(hashtextextended(p_bucket, 0));

  select count(*) into v_count
    from rate_limit_events
    where bucket = p_bucket
      and created_at >= now() - (p_window_ms || ' milliseconds')::interval;

  if v_count >= p_limit then
    return false;
  end if;

  insert into rate_limit_events (bucket) values (p_bucket);
  return true;
end;
$$;

revoke execute on function check_and_record_rate_limit(text, int, bigint) from public, anon, authenticated;
grant execute on function check_and_record_rate_limit(text, int, bigint) to service_role;
