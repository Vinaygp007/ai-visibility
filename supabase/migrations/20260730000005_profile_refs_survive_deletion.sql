-- profiles.referred_by, invites.created_by, credit_ledger.created_by, and
-- audit_log.actor_id all reference profiles(id) with no ON DELETE rule,
-- which defaults to blocking the delete entirely. Right now that means
-- deleting a user who has ever referred someone, created an invite, made a
-- manual credit adjustment, or performed any admin action (i.e. any admin
-- with audit log history) fails outright via a foreign key violation, which
-- the admin API surfaces only as a generic "Failed to delete user".
--
-- Switch all four to ON DELETE SET NULL so account deletion always
-- succeeds, and the historical row (an invite, a ledger entry, an audit
-- log line, a referred profile) survives with just the actor reference
-- nulled out — same pattern as 20260730000004 for referrals.
do $$
declare
  v_constraint text;
  v_table text;
  v_column text;
begin
  for v_table, v_column in
    select * from (values
      ('profiles', 'referred_by'),
      ('invites', 'created_by'),
      ('credit_ledger', 'created_by'),
      ('audit_log', 'actor_id')
    ) as t(tbl, col)
  loop
    select conname into v_constraint
      from pg_constraint
      where conrelid = v_table::regclass
        and contype = 'f'
        and conkey = (select array_agg(attnum) from pg_attribute
                      where attrelid = v_table::regclass and attname = v_column);
    if v_constraint is not null then
      execute format('alter table %I drop constraint %I', v_table, v_constraint);
    end if;
    execute format('alter table %I add constraint %I foreign key (%I) references profiles(id) on delete set null',
                    v_table, v_table || '_' || v_column || '_fkey', v_column);
  end loop;
end $$;
