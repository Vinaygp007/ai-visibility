-- Preserves referral attribution for people who click a referral link
-- (/signup?ref=CODE) but have no invite yet, and so get bounced to the
-- waitlist instead of straight through signup. Without this, that ref code
-- would be dropped on the floor and the original referrer would never get
-- credited once this person is eventually invited and signs up.
alter table waitlist add column if not exists ref_code text;
