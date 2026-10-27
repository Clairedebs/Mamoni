-- The app language chosen in Settings, so push reminders (sent from the server) use it too.
-- Run after 20261025000000_onboarding.sql. Existing accounts stay in English.

alter table public.profiles
  add column language text not null default 'en' check (language in ('en', 'fr'));
