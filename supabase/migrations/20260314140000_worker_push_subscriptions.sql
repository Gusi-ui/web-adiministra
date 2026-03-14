-- Migration: worker_push_subscriptions
-- Stores Web Push (VAPID) subscriptions for each worker device.

create table if not exists worker_push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  worker_id   uuid        not null references workers(id) on delete cascade,
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subs_worker_id
  on worker_push_subscriptions(worker_id);

-- RLS: workers can only see and manage their own subscriptions
alter table worker_push_subscriptions enable row level security;

create policy "workers_own_push_subs" on worker_push_subscriptions
  using (worker_id = auth.uid());

create policy "workers_insert_own_push_subs" on worker_push_subscriptions
  for insert with check (worker_id = auth.uid());

create policy "workers_delete_own_push_subs" on worker_push_subscriptions
  for delete using (worker_id = auth.uid());
