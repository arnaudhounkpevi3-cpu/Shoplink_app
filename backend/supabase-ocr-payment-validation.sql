alter table public.users
  add column if not exists paiement boolean not null default false;

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.users(id) on delete set null,
  payment_id text references public.payments(id) on delete set null,
  montant integer not null,
  operateur text,
  code_transaction text unique,
  statut text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists transactions_code_transaction_idx on public.transactions(code_transaction);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_payment_id_idx on public.transactions(payment_id);

create table if not exists public.payment_validation_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.users(id) on delete set null,
  payment_id text references public.payments(id) on delete set null,
  amount_expected integer default 0,
  amount_detected integer default 0,
  operator_detected text,
  transaction_code text,
  extracted_text text,
  status text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists payment_validation_attempts_user_id_idx on public.payment_validation_attempts(user_id);
create index if not exists payment_validation_attempts_payment_id_idx on public.payment_validation_attempts(payment_id);
create index if not exists payment_validation_attempts_transaction_code_idx on public.payment_validation_attempts(transaction_code);
