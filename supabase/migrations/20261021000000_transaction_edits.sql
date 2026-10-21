-- Editing and deleting transactions safely.
-- Run after 20261019000000_tontine_groups.sql.

-- A savings deposit made while collecting a payout is linked to that payout,
-- so deleting the payout removes the deposit too.
alter table public.transactions
  add column linked_to uuid references public.transactions (id) on delete cascade;
create index transactions_linked_to on public.transactions (linked_to) where linked_to is not null;

-- Deleting a payout puts its turn back to "ready to collect".
create or replace function public.reopen_turn_on_payout_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.tontine_turns
     set status = 'upcoming', transaction_id = null, notified_on = null
   where transaction_id = old.id;
  return old;
end;
$$;

create trigger transactions_reopen_turn before delete on public.transactions
  for each row execute function public.reopen_turn_on_payout_delete();

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
    insert into public.transactions (kind, amount, pot_id, occurred_on, note, linked_to)
    values ('deposit', p_save_amount, p_save_pot_id, p_occurred_on, 'From ' || v_group.name || ' payout', v_income);
  end if;

  update public.tontine_turns set status = 'collected', transaction_id = v_income where id = p_turn_id;
  return v_income;
end;
$$;
