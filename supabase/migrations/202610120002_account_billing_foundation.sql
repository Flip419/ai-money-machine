begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  created_at timestamptz not null default now()
);
-- Only non-financial profile data is deleted with the Auth account.
create function public.create_account_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_account_profile() from public, anon, authenticated;
create trigger on_auth_user_created_profile after insert on auth.users
  for each row execute function public.create_account_profile();
-- Backfill accounts created between schema review and application.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

create table public.paddle_customers (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('sandbox', 'live')),
  user_id uuid references auth.users(id) on delete set null,
  owner_reference uuid not null,
  paddle_customer_id text not null check (paddle_customer_id ~ '^ctm_[a-z0-9]+$'),
  created_at timestamptz not null default now(),
  check (user_id is null or user_id = owner_reference),
  unique (environment, owner_reference),
  unique (environment, paddle_customer_id),
  unique (environment, owner_reference, paddle_customer_id)
);

create table public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('sandbox', 'live')),
  user_id uuid references auth.users(id) on delete set null,
  owner_reference uuid not null,
  paddle_customer_id text not null,
  plan text not null check (plan in ('starter', 'pro', 'studio_premium')),
  paddle_price_id text not null check (paddle_price_id ~ '^pri_[a-z0-9]+$'),
  paddle_transaction_id text check (paddle_transaction_id ~ '^txn_[a-z0-9]+$'),
  request_key uuid not null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'completed', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  check (user_id is null or user_id = owner_reference),
  foreign key (environment, owner_reference, paddle_customer_id)
    references public.paddle_customers (environment, owner_reference, paddle_customer_id) on delete restrict,
  unique (environment, paddle_transaction_id),
  unique (environment, owner_reference, request_key)
);

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('sandbox', 'live')),
  user_id uuid references auth.users(id) on delete set null,
  owner_reference uuid not null,
  paddle_customer_id text not null,
  paddle_subscription_id text not null check (paddle_subscription_id ~ '^sub_[a-z0-9]+$'),
  paddle_price_id text not null check (paddle_price_id ~ '^pri_[a-z0-9]+$'),
  plan text not null check (plan in ('starter', 'pro', 'studio_premium')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancellation_effective_at timestamptz,
  paid_through timestamptz,
  grace_until timestamptz,
  entitlement_revoked_at timestamptz,
  entitlement_event_id text,
  last_event_id text not null,
  last_event_occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (user_id is null or user_id = owner_reference),
  check (current_period_end is null or current_period_start is null or current_period_end > current_period_start),
  check (paid_through is null or entitlement_event_id is not null),
  check (grace_until is null or (paid_through is not null and grace_until >= paid_through)),
  foreign key (environment, owner_reference, paddle_customer_id)
    references public.paddle_customers (environment, owner_reference, paddle_customer_id) on delete restrict,
  foreign key (environment, last_event_id)
    references public.paddle_webhook_events (environment, event_id) on delete restrict,
  foreign key (environment, entitlement_event_id)
    references public.paddle_webhook_events (environment, event_id) on delete restrict,
  unique (environment, paddle_subscription_id)
);

-- Retain the original account UUID after closure while removing the live Auth FK.
-- Never authorize a closed account using owner_reference.
create function public.prevent_billing_owner_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.environment is distinct from old.environment
    or new.owner_reference is distinct from old.owner_reference
    or (new.user_id is not null and new.user_id is distinct from old.user_id) then
    raise exception 'Billing ownership cannot be reassigned';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_billing_owner_change() from public, anon, authenticated;
create trigger paddle_customer_owner_immutable before update on public.paddle_customers
  for each row execute function public.prevent_billing_owner_change();
create trigger billing_checkout_owner_immutable before update on public.billing_checkouts
  for each row execute function public.prevent_billing_owner_change();
create trigger billing_subscription_owner_immutable before update on public.billing_subscriptions
  for each row execute function public.prevent_billing_owner_change();

alter table public.profiles enable row level security;
alter table public.paddle_customers enable row level security;
alter table public.billing_checkouts enable row level security;
alter table public.billing_subscriptions enable row level security;

revoke all on public.profiles, public.paddle_customers, public.billing_checkouts,
  public.billing_subscriptions from public, anon, authenticated, service_role;
grant select on public.profiles, public.billing_subscriptions to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update on public.profiles, public.paddle_customers,
  public.billing_checkouts, public.billing_subscriptions to service_role;
-- No DELETE grants for financial tables. RLS has no client billing-write policies.
create policy profiles_read_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy subscriptions_read_own on public.billing_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create index billing_subscriptions_user on public.billing_subscriptions (user_id, environment);
create index billing_checkouts_user on public.billing_checkouts (user_id, environment);

commit;
