-- Adds the super_admin role. Kept in its own migration because Postgres won't
-- let a newly added enum value be used inside the same transaction that adds
-- it; 20261113000002 uses it.
alter type user_role add value if not exists 'super_admin';
