alter table public.users
  add column if not exists paiement boolean not null default false;

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.users(id) on delete set null,
  payment_id text references public.payments(id) on delete set null,
  telephone text,
  reference text unique not null,
  montant integer not null,
  reseau text,
  statut text not null default 'pending',
  matched_amount integer default 0,
  sms_from text,
  raw_sms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists transactions_telephone_statut_idx on public.transactions(telephone, statut);
create index if not exists transactions_reference_idx on public.transactions(reference);
create index if not exists transactions_payment_id_idx on public.transactions(payment_id);

create table if not exists public.sms_logs (
  id uuid default gen_random_uuid() primary key,
  sms_from text,
  content text,
  telephone text,
  reference text,
  matched_amount integer default 0,
  status text,
  reason text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sms_logs_telephone_idx on public.sms_logs(telephone);
create index if not exists sms_logs_created_at_idx on public.sms_logs(created_at);
