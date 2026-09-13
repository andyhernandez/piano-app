-- Weekly digest schedule: every Sunday 18:00 UTC. Replace the project ref for your own project.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'keycadence-weekly-digest',
  '0 18 * * 0',
  $$ select net.http_post(
       url := 'https://tfsqqbsnmllagsdiranr.supabase.co/functions/v1/weekly-digest',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
