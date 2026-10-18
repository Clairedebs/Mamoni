-- Tontine groups: rotating contribution groups tracked as a light layer on the budget.
-- Contributions are expense transactions linked to a group; payouts are income transactions.
-- Run after 20261018000000_init.sql.

-- ---------------------------------------------------------------- category roles
alter table public.categories
  add column role text check (role in ('tontine', 'tontine_payout'));
create unique index categories_one_role on public.categories (user_id, role) where role is not null;

-- Reuse categories the user already created with these names.
update public.categories set role = 'tontine'
where id in (
  select distinct on (user_id) id from public.categories
  where kind = 'expense' and lower(btrim(name)) = 'tontine' and role is null
  order by user_id, created_at
);
update public.categories set role = 'tontine_payout'
where id in (
  select distinct on (user_id) id from public.categories
  where kind = 'income' and lower(btrim(name)) = 'tontine payout' and role is null
  order by user_id, created_at
);

insert into public.categories (user_id, kind, name, icon, color, is_default, position, role)
select pr.id, 'expense', 'Tontine', 'hand-coins', 'amber', true, 7, 'tontine'
from public.profiles pr
where not exists (select 1 from public.categories c where c.user_id = pr.id and c.role = 'tontine')
  and not exists (select 1 from public.categories c where c.user_id = pr.id and c.kind = 'expense' and lower(btrim(c.name)) = 'tontine');

insert into public.categories (user_id, kind, name, icon, color, is_default, position, role)
select pr.id, 'income', 'Tontine payout', 'hand-coins', 'amber', true, 3, 'tontine_payout'
from public.profiles pr
where not exists (select 1 from public.categories c where c.user_id = pr.id and c.role = 'tontine_payout')
  and not exists (select 1 from public.categories c where c.user_id = pr.id and c.kind = 'income' and lower(btrim(c.name)) = 'tontine payout');

-- ---------------------------------------------------------------- groups
create table public.tontine_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 32),
  amount_per_name bigint not null check (amount_per_name > 0 and amount_per_name < 10000000000),
  names_total smallint not null check (names_total between 2 and 200),
  names_held smallint not null check (names_held >= 1),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  deadline_time time not null default '18:00',
  cycle_start date not null,
  cycle_end date not null,
  first_due date not null,
  anchor_day smallint not null check (anchor_day between 1 and 31),
  opening_credit bigint not null default 0 check (opening_credit >= 0),
  payments_offset bigint not null default 0 check (payments_offset >= 0),
  reminders_enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'ended')),
  ended_on date,
  last_due_reminder_for date,
  last_behind_reminder_for date,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (names_held <= names_total),
  check (cycle_end >= cycle_start),
  check (first_due >= cycle_start)
);

create table public.tontine_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  group_id uuid not null,
  turn_on date not null,
  expected_amount bigint not null check (expected_amount > 0),
  status text not null default 'upcoming' check (status in ('upcoming', 'collected', 'before_app')),
  transaction_id uuid references public.transactions (id) on delete set null,
  notified_on date,
  created_at timestamptz not null default now(),
  foreign key (group_id, user_id) references public.tontine_groups (id, user_id) on delete cascade
);
create index tontine_turns_group on public.tontine_turns (group_id, turn_on);

-- ---------------------------------------------------------------- link transactions
alter table public.transactions
  add column group_id uuid,
  add constraint transactions_group_fk foreign key (group_id, user_id) references public.tontine_groups (id, user_id) on delete restrict,
  add constraint transactions_group_kind check (group_id is null or kind in ('expense', 'income'));
create index transactions_group on public.transactions (group_id) where group_id is not null;

-- ---------------------------------------------------------------- security
alter table public.tontine_groups enable row level security;
alter table public.tontine_turns enable row level security;
create policy "own tontine groups" on public.tontine_groups
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tontine turns" on public.tontine_turns
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.tontine_groups, public.tontine_turns to authenticated;

-- ---------------------------------------------------------------- collect a payout atomically
create or replace function public.collect_payout(
  p_turn_id uuid,
  p_amount bigint,
  p_occurred_on date,
  p_save_pot_id uuid default null,
  p_save_amount bigint default 0
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_turn public.tontine_turns;
  v_group public.tontine_groups;
  v_category uuid;
  v_income uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the payout amount.'; end if;
  if p_save_amount is null or p_save_amount < 0 or p_save_amount > p_amount then
    raise exception 'You can move at most the payout amount.';
  end if;

  select * into v_turn from public.tontine_turns where id = p_turn_id for update;
  if not found then raise exception 'Turn not found.'; end if;
  if v_turn.status <> 'upcoming' then raise exception 'This turn is already collected.'; end if;
  select * into v_group from public.tontine_groups where id = v_turn.group_id;

  select id into v_category from public.categories where user_id = v_turn.user_id and role = 'tontine_payout';
  if v_category is null then raise exception 'The Tontine payout category is missing.'; end if;

  insert into public.transactions (kind, amount, category_id, group_id, occurred_on, note)
  values ('income', p_amount, v_category, v_group.id, p_occurred_on, 'Payout · ' || v_group.name)
  returning id into v_income;

  if p_save_pot_id is not null and p_save_amount > 0 then
    insert into public.transactions (kind, amount, pot_id, occurred_on, note)
    values ('deposit', p_save_amount, p_save_pot_id, p_occurred_on, 'From ' || v_group.name || ' payout');
  end if;

  update public.tontine_turns set status = 'collected', transaction_id = v_income where id = p_turn_id;
  return v_income;
end;
$$;
grant execute on function public.collect_payout(uuid, bigint, date, uuid, bigint) to authenticated;

-- ---------------------------------------------------------------- new accounts
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'name'), ''));

  insert into public.categories (user_id, kind, name, icon, color, description, is_default, position, role) values
    (new.id, 'expense', 'Groceries',      'shopping-basket', 'green',  null, true, 0, null),
    (new.id, 'expense', 'Transport',      'bus',             'cyan',   null, true, 1, null),
    (new.id, 'expense', 'Housing',        'house-plug',      'purple', null, true, 2, null),
    (new.id, 'expense', 'Bills',          'receipt-text',    'slate',  null, true, 3, null),
    (new.id, 'expense', 'Health',         'heart-pulse',     'red',    null, true, 4, null),
    (new.id, 'expense', 'Eating out',     'utensils',        'pink',   null, true, 5, null),
    (new.id, 'expense', 'Family & gifts', 'gift',            'orange', null, true, 6, null),
    (new.id, 'expense', 'Tontine',        'hand-coins',      'amber',  null, true, 7, 'tontine'),
    (new.id, 'income',  'Salary',         'briefcase',       'teal',   null, true, 0, null),
    (new.id, 'income',  'Side business',  'store',           'blue',   null, true, 1, null),
    (new.id, 'income',  'Other income',   'sparkles',        'amber',  null, true, 2, null),
    (new.id, 'income',  'Tontine payout', 'hand-coins',      'amber',  null, true, 3, 'tontine_payout'),
    (new.id, 'saving',  'Contributions',  'hand-coins',      'amber',  'Mutual funds and group savings', true, 0, null),
    (new.id, 'saving',  'Bank',           'landmark',        'blue',   'Bank accounts and deposits', true, 1, null),
    (new.id, 'saving',  'Family',         'users',           'coral',  'Family pots and projects', true, 2, null);
  return new;
end;
$$;
