-- One currency per account, chosen by the user. Amounts now keep cents (2 decimals);
-- existing whole amounts are unchanged. Changing currency only relabels: the numbers stay.
-- Run after 20261021000000_transaction_edits.sql.

drop view public.pot_balances;
drop function public.collect_payout(uuid, bigint, date, uuid, bigint);

alter table public.transactions alter column amount type numeric(14, 2);
alter table public.pots
  alter column initial_amount type numeric(14, 2),
  alter column goal_amount type numeric(14, 2);
alter table public.profiles alter column opening_cash type numeric(14, 2);
alter table public.tontine_groups
  alter column amount_per_name type numeric(14, 2),
  alter column opening_credit type numeric(14, 2),
  alter column payments_offset type numeric(14, 2);
alter table public.tontine_turns alter column expected_amount type numeric(14, 2);

alter table public.profiles
  add constraint profiles_currency_known check (currency in ('XOF','XAF','NGN','GHS','GNF','CDF','MAD','DZD','TND','EUR','USD','GBP','CAD','CHF'));

create view public.pot_balances with (security_invoker = true) as
select
  p.*,
  p.initial_amount + coalesce(sum(
    case t.kind when 'deposit' then t.amount when 'withdrawal' then -t.amount else 0 end
  ), 0) as balance
from public.pots p
left join public.transactions t on t.pot_id = p.id
group by p.id;
grant select on public.pot_balances to authenticated;

create function public.collect_payout(
  p_turn_id uuid,
  p_amount numeric,
  p_occurred_on date,
  p_save_pot_id uuid default null,
  p_save_amount numeric default 0
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
  p_amount := round(p_amount, 2);
  p_save_amount := round(coalesce(p_save_amount, 0), 2);
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the payout amount.'; end if;
  if p_save_amount < 0 or p_save_amount > p_amount then
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
grant execute on function public.collect_payout(uuid, numeric, date, uuid, numeric) to authenticated;
