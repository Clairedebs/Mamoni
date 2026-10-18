-- Schedules the reminder job every 15 minutes from inside Supabase (works on the free plan).
-- 1. Database › Extensions: enable "pg_cron" and "pg_net".
-- 2. Replace the two placeholders below, then run this in the SQL editor.
--    <APP_URL>     your deployed URL, e.g. https://ma-moni.vercel.app
--    <CRON_SECRET> the same value as CRON_SECRET in your app environment

select cron.schedule(
  'ma-moni-reminders',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := '<APP_URL>/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);

-- To stop it later:  select cron.unschedule('ma-moni-reminders');
