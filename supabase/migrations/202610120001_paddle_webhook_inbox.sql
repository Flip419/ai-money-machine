-- Additive only. Does not modify customers, subscriptions, or existing tables.
-- Intentionally fails if this name already exists: inspect before applying.
begin;
create table public.paddle_webhook_events (
  environment text not null check (environment in ('sandbox', 'live')),
  event_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  processed_at timestamptz,
  primary key (environment, event_id)
);
alter table public.paddle_webhook_events enable row level security;
revoke all on public.paddle_webhook_events from public, anon, authenticated, service_role;
grant select, insert, update on public.paddle_webhook_events to service_role;
create index paddle_webhook_events_pending on public.paddle_webhook_events (received_at)
  where processed_at is null;
commit;
