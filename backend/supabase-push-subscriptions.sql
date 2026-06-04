create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id text,
  user_email text,
  subscription jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_enabled_idx
  on public.push_subscriptions (enabled);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);
