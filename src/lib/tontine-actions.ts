'use server'

import { refresh } from 'next/cache'
import { requireUser } from './supabase/server'
import { getTontineGroup, getToday } from './data'
import { rebaseOnEdit, validateGroupInput, validatePayout, type GroupInput } from './tontine'
import { parseIso } from './format'
import { roundMoney } from './currencies'

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string }
const fail = (error: string): Result<never> => ({ ok: false, error })
const GENERIC = 'Something went wrong. Please try again.'

export async function saveTontineGroup(
  input: Omit<GroupInput, 'turns'> & { id?: string; turns: { id?: string; turnOn: string; beforeApp: boolean }[]; openingCredit?: number },
): Promise<Result<{ id: string }>> {
  const { supabase } = await requireUser()
  const invalid = validateGroupInput(input)
  if (invalid) return fail(invalid)
  const payout = input.amountPerName * input.namesTotal
  const base = {
    name: input.name.trim().slice(0, 32),
    amount_per_name: input.amountPerName,
    names_total: input.namesTotal,
    names_held: input.namesHeld,
    frequency: input.frequency,
    deadline_time: input.deadlineTime,
    cycle_start: input.cycleStart,
    cycle_end: input.cycleEnd,
  }

  let id = input.id
  if (!id) {
    const { data, error } = await supabase
      .from('tontine_groups')
      .insert({
        ...base,
        first_due: input.firstDue,
        anchor_day: parseIso(input.firstDue).getDate(),
        opening_credit: Math.max(0, roundMoney(input.openingCredit ?? 0)),
      })
      .select('id')
      .single()
    if (error) return fail(GENERIC)
    id = data.id as string
  } else {
    const current = await getTontineGroup(id)
    if (!current) return fail('Group not found.')
    const g = current.group
    const patch: Record<string, unknown> = { ...base }
    const r =
      g.status === 'active'
        ? rebaseOnEdit(
            current.coverage,
            { perPeriod: g.amount_per_name * g.names_held, frequency: g.frequency },
            { perPeriod: input.amountPerName * input.namesHeld, frequency: input.frequency },
          )
        : null
    if (r) {
      patch.first_due = r.firstDue
      patch.opening_credit = r.openingCredit
      patch.payments_offset = current.paidTotal
      if (g.frequency !== input.frequency) patch.anchor_day = parseIso(r.firstDue).getDate()
    }
    const { error } = await supabase.from('tontine_groups').update(patch).eq('id', id)
    if (error) return fail(GENERIC)

    const keep = new Set(input.turns.map((t) => t.id).filter(Boolean))
    const removable = current.turns.filter((t) => !keep.has(t.id) && t.status !== 'collected').map((t) => t.id)
    if (removable.length) await supabase.from('tontine_turns').delete().in('id', removable)
  }

  for (const t of input.turns) {
    const row = { turn_on: t.turnOn, status: t.beforeApp ? 'before_app' : 'upcoming', expected_amount: payout }
    if (t.id) {
      const { error } = await supabase.from('tontine_turns').update(row).eq('id', t.id).neq('status', 'collected')
      if (error) return fail(GENERIC)
    } else {
      const { error } = await supabase.from('tontine_turns').insert({ ...row, group_id: id })
      if (error) return fail(GENERIC)
    }
  }
  refresh()
  return { ok: true, data: { id } }
}

export async function collectTontinePayout(input: { turnId: string; amount: number; occurredOn: string; savePotId?: string; saveAmount?: number }): Promise<Result<{ id: string }>> {
  const { supabase } = await requireUser()
  const amount = roundMoney(input.amount)
  const save = input.savePotId ? roundMoney(input.saveAmount ?? 0) : 0
  const invalid = validatePayout(amount, save)
  if (invalid) return fail(invalid)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) return fail('Pick a valid date.')
  const { data, error } = await supabase.rpc('collect_payout', {
    p_turn_id: input.turnId,
    p_amount: amount,
    p_occurred_on: input.occurredOn,
    p_save_pot_id: input.savePotId ?? null,
    p_save_amount: save,
  })
  if (error) return fail(error.message?.endsWith('.') ? error.message : GENERIC)
  refresh()
  return { ok: true, data: { id: data as string } }
}

export async function endTontineCycle(id: string): Promise<Result> {
  const { supabase } = await requireUser()
  const today = await getToday()
  const { error } = await supabase.from('tontine_groups').update({ status: 'ended', ended_on: today }).eq('id', id)
  if (error) return fail(GENERIC)
  refresh()
  return { ok: true, data: null }
}

export async function setTontineReminders(id: string, enabled: boolean): Promise<Result> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('tontine_groups').update({ reminders_enabled: enabled }).eq('id', id)
  if (error) return fail(GENERIC)
  refresh()
  return { ok: true, data: null }
}
