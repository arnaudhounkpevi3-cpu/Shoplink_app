create table if not exists public.root_visits (
  id text primary key,
  path text not null default '/',
  source text not null default 'direct',
  visitor_id text,
  session_id text,
  ip_address text,
  user_agent text,
  referrer text,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists root_visits_visited_at_idx on public.root_visits(visited_at);
create index if not exists root_visits_source_idx on public.root_visits(source);
create index if not exists root_visits_visitor_id_idx on public.root_visits(visitor_id);
