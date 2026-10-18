import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import { requireUser } from './supabase/server'
import { addDays, minutesIn, monthRange, shortDate, todayIn } from './format'
import { groupCoverage, statusLine, type Coverage, type GroupStatus } from './tontine'
import type { Category, Pot, Profile, TontineGroup, TontineTurn, Transaction } from './types'

export const getProfile = cache(async (): Promise<Profile> => {
  const { supabase, userId } = await requireUser()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return { ...data, reminder_time: String(data.reminder_time).slice(0, 5) } as Profile
})

export const getToday = cache(async () => {
  const { timezone } = await getProfile()
  await connection()
  return todayIn(timezone)
})

export const getCategories = cache(async (): Promise<Category[]> => {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('categories')
    .select('id, kind, name, icon, color, description, is_default, position, role')
    .order('position')
    .order('created_at')
  if (error) throw error
  return data as Category[]
})

export const getPots = cache(async (): Promise<Pot[]> => {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('pot_balances')
    .select('id, category_id, name, note, initial_amount, started_on, goal_amount, due_date, repeat, balance')
    .order('created_at')
  if (error) throw error
  return data as Pot[]
})

export async function getTransactions(opts: { from?: string; to?: string; limit?: number; potId?: string } = {}) {
  const { supabase } = await requireUser()
  let q = supabase
    .from('transactions')
    .select('id, kind, amount, category_id, pot_id, occurred_on, note, created_at, group_id')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (opts.from) q = q.gte('occurred_on', opts.from)
  if (opts.to) q = q.lte('occurred_on', opts.to)
  if (opts.potId) q = q.eq('pot_id', opts.potId)
  if (opts.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return data as Transaction[]
}

/** Totals for every transaction ever logged, used for the available-cash figure. */
export const getLifetimeTotals = cache(async () => {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.from('transactions').select('kind, amount')
  if (error) throw error
  const t = { income: 0, expense: 0, deposit: 0, withdrawal: 0 }
  for (const r of data as { kind: keyof typeof t; amount: number }[]) t[r.kind] += Number(r.amount)
  return t
})

export function sumBy(txs: Transaction[], kind: Transaction['kind']) {
  return txs.filter((t) => t.kind === kind).reduce((a, t) => a + Number(t.amount), 0)
}

/** Six months of income/expense totals ending with the current month. */
export async function getMonthlyFlows(today: string) {
  const months: { key: string; start: string; end: string }[] = []
  const d = new Date(`${today}T12:00:00`)
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    const r = monthRange(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`)
    months.push({ key: r.start, ...r })
  }
  const txs = await getTransactions({ from: months[0].start, to: months[5].end })
  return months.map((m) => {
    const inMonth = txs.filter((t) => t.occurred_on >= m.start && t.occurred_on <= m.end)
    return { month: m.start, income: sumBy(inMonth, 'income'), expense: sumBy(inMonth, 'expense'), deposit: sumBy(inMonth, 'deposit') }
  })
}

/** Total savings at the end of each of the last six months. */
export async function getSavingsHistory(today: string) {
  const { supabase } = await requireUser()
  const [pots, { data, error }] = await Promise.all([
    getPots(),
    supabase.from('transactions').select('kind, amount, occurred_on').in('kind', ['deposit', 'withdrawal']),
  ])
  if (error) throw error
  const d = new Date(`${today}T12:00:00`)
  return Array.from({ length: 6 }, (_, k) => {
    const m = new Date(d.getFullYear(), d.getMonth() - (5 - k), 1)
    const { start, end } = monthRange(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`)
    const cutoff = end > today ? today : end
    const base = pots.filter((p) => p.started_on <= cutoff).reduce((a, p) => a + Number(p.initial_amount), 0)
    const moves = (data as { kind: string; amount: number; occurred_on: string }[])
      .filter((t) => t.occurred_on <= cutoff)
      .reduce((a, t) => a + (t.kind === 'deposit' ? 1 : -1) * Number(t.amount), 0)
    return { month: start, total: base + moves }
  })
}

export async function daysSinceLastEntry(today: string) {
  const [last] = await getTransactions({ limit: 1 })
  if (!last) return null
  let n = 0
  while (addDays(last.occurred_on, n) < today && n < 365) n++
  return n
}

export type TontineView = {
  group: TontineGroup
  turns: TontineTurn[]
  /** Contributions counted toward coverage (after the last schedule change). */
  paid: number
  /** All contributions logged for this group. */
  paidTotal: number
  collected: number
  coverage: Coverage
  status: GroupStatus
}

const TONE_ORDER: GroupStatus['tone'][] = ['turn', 'late', 'soon', 'ok', 'done']

export const getTontineGroups = cache(async (): Promise<TontineView[]> => {
  const { supabase } = await requireUser()
  const [profile, today] = await Promise.all([getProfile(), getToday()])
  const nowMinutes = minutesIn(profile.timezone)
  const [groups, turns, txs] = await Promise.all([
    supabase.from('tontine_groups').select('*').order('created_at'),
    supabase.from('tontine_turns').select('id, group_id, turn_on, expected_amount, status, transaction_id').order('turn_on'),
    supabase.from('transactions').select('group_id, kind, amount').not('group_id', 'is', null),
  ])
  for (const r of [groups, turns, txs]) if (r.error) throw r.error

  const views = (groups.data as TontineGroup[]).map((raw): TontineView => {
    const group = { ...raw, deadline_time: String(raw.deadline_time).slice(0, 5) }
    const mine = (txs.data as { group_id: string; kind: string; amount: number }[]).filter((t) => t.group_id === group.id)
    const paidTotal = mine.filter((t) => t.kind === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const collected = mine.filter((t) => t.kind === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const paid = Math.max(0, paidTotal - Number(group.payments_offset))
    const groupTurns = (turns.data as TontineTurn[]).filter((t) => t.group_id === group.id)
    const c = groupCoverage(group, paid, today, nowMinutes)
    const turnToday = groupTurns.some((t) => t.status === 'upcoming' && t.turn_on <= today)
    const status: GroupStatus =
      group.status === 'ended'
        ? { tone: 'done', text: `Ended ${shortDate(group.ended_on ?? today)}` }
        : statusLine(c, { today, turnToday, label: shortDate }, group.frequency)
    return { group, turns: groupTurns, paid, paidTotal, collected, coverage: c, status }
  })

  return views.sort((a, b) => {
    if (a.group.status !== b.group.status) return a.group.status === 'active' ? -1 : 1
    if (a.group.status === 'ended') return (b.group.ended_on ?? '').localeCompare(a.group.ended_on ?? '')
    return TONE_ORDER.indexOf(a.status.tone) - TONE_ORDER.indexOf(b.status.tone)
  })
})

export async function getTontineGroup(id: string) {
  return (await getTontineGroups()).find((v) => v.group.id === id) ?? null
}
