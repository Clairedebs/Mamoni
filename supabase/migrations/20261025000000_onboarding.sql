-- Remembers when someone finished (or skipped) the welcome tour.
-- Run after 20261023000000_currency.sql. Existing accounts are marked done so they don't see it again.

alter table public.profiles add column onboarded_at timestamptz;
update public.profiles set onboarded_at = now() where onboarded_at is null;
