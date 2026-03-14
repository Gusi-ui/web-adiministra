-- Migration: cleanup_expired_notifications
-- Schedules a daily pg_cron job to delete expired worker notifications.
-- Requires the pg_cron extension (available on Supabase Pro and above).

create extension if not exists pg_cron;

-- Remove any existing schedule with this name to allow re-runs
select cron.unschedule('cleanup-expired-notifications');

-- Run every day at 03:00 UTC
select cron.schedule(
  'cleanup-expired-notifications',
  '0 3 * * *',
  $$
    delete from worker_notifications
    where expires_at is not null
      and expires_at < now();
  $$
);
