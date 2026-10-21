-- Moni yem: initial schema
-- Amounts are whole FCFA stored as bigint. Every row belongs to one user and is protected by RLS.

create type public.category_kind as enum ('expense', 'income', 'saving');
create type public.transaction_kind as enum ('expense', 'income', 'deposit', 'withdrawal');
create type public.repeat_kind as enum ('weekly', 'monthly', 'once');
create type public.reminder_frequency as enum ('daily', 'thrice_weekly', 'weekly');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text not null default 'XOF',
  timezone text not null default 'Africa/Abidjan',
  opening_cash bigint not null default 0 check (opening_cash >= 0),
  reminder_enabled boolean not null default true,
  reminder_frequency public.reminder_frequency not null default 'daily',
  reminder_time time not null default '20:30',
  nudge_enabled boolean not null default true,
  contribution_enabled boolean not null default true,
  contribution_lead_days smallint not null default 1 check (contribution_lead_days between 0 and 2),
  last_reminded_on date,
  last_nudged_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.category_kind not null,
  name text not null check (char_length(btrim(name)) between 1 and 24),
  icon text not null,
  color text not null check (color in ('violet','purple','blue','cyan','teal','green','amber','orange','coral','red','pink','slate')),
  description text check (description is null or char_length(description) <= 48),
  is_default boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index categories_unique_name on public.categories (user_id, kind, lower(btrim(name)));

-- ---------------------------------------------------------------- pots (savings accounts inside a savings category)
create table public.pots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 32),
  note text check (note is null or char_length(note) <= 60),
  initial_amount bigint not null default 0 check (initial_amount >= 0),
  started_on date not null default current_date,
  goal_amount bigint check (goal_amount is null or goal_amount > 0),
  due_date date,
  repeat public.repeat_kind not null default 'monthly',
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete restrict
);

-- ---------------------------------------------------------------- transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.transaction_kind not null,
  amount bigint not null check (amount > 0 and amount < 10000000000),
  category_id uuid,
  pot_id uuid,
  occurred_on date not null,
  note text check (note is null or char_length(note) <= 80),
  created_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete restrict,
  foreign key (pot_id, user_id) references public.pots (id, user_id) on delete restrict,
  check (
    (kind in ('expense', 'income') and category_id is not null and pot_id is null)
    or (kind in ('deposit', 'withdrawal') and pot_id is not null and category_id is null)
  )
);
create index transactions_user_date on public.transactions (user_id, occurred_on desc, created_at desc);
create index transactions_pot on public.transactions (pot_id) where pot_id is not null;

-- ---------------------------------------------------------------- push subscriptions
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- integrity: kinds must match
create or replace function public.check_category_kinds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare k public.category_kind;
begin
  if tg_table_name = 'pots' then
    select kind into k from public.categories where id = new.category_id;
    if k is distinct from 'saving' then
      raise exception 'A pot must belong to a savings category';
    end if;
  elsif tg_table_name = 'transactions' and new.category_id is not null then
    select kind into k from public.categories where id = new.category_id;
    if k::text is distinct from new.kind::text then
      raise exception 'Category kind % does not match transaction kind %', k, new.kind;
    end if;
  end if;
  return new;
end;
$$;

create trigger pots_kind_check before insert or update on public.pots
  for each row execute function public.check_category_kinds();
create trigger transactions_kind_check before insert or update on public.transactions
  for each row execute function public.check_category_kinds();

-- ---------------------------------------------------------------- balances
create view public.pot_balances with (security_invoker = true) as
select
  p.*,
  p.initial_amount + coalesce(sum(
    case t.kind when 'deposit' then t.amount when 'withdrawal' then -t.amount else 0 end
  ), 0) as balance
from public.pots p
left join public.transactions t on t.pot_id = p.id
group by p.id;

-- ---------------------------------------------------------------- new user bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'name'), ''));

  insert into public.categories (user_id, kind, name, icon, color, description, is_default, position) values
    (new.id, 'expense', 'Groceries',      'shopping-basket', 'green',  null, true, 0),
    (new.id, 'expense', 'Transport',      'bus',             'cyan',   null, true, 1),
    (new.id, 'expense', 'Housing',        'house-plug',      'purple', null, true, 2),
    (new.id, 'expense', 'Bills',          'receipt-text',    'slate',  null, true, 3),
    (new.id, 'expense', 'Health',         'heart-pulse',     'red',    null, true, 4),
    (new.id, 'expense', 'Eating out',     'utensils',        'pink',   null, true, 5),
    (new.id, 'expense', 'Family & gifts', 'gift',            'orange', null, true, 6),
    (new.id, 'income',  'Salary',         'briefcase',       'teal',   null, true, 0),
    (new.id, 'income',  'Side business',  'store',           'blue',   null, true, 1),
    (new.id, 'income',  'Other income',   'sparkles',        'amber',  null, true, 2),
    (new.id, 'saving',  'Contributions',  'hand-coins',      'amber',  'Tontines and group contributions', true, 0),
    (new.id, 'saving',  'Bank',           'landmark',        'blue',   'Bank accounts and deposits', true, 1),
    (new.id, 'saving',  'Family',         'users',           'coral',  'Family pots and projects', true, 2);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.pots enable row level security;
alter table public.transactions enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own categories" on public.categories
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own pots" on public.pots
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own transactions" on public.transactions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.pots, public.transactions, public.push_subscriptions to authenticated;
grant select on public.pot_balances to authenticated;
