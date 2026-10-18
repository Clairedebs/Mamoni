import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import { requireUser } from './supabase/server'
import { addDays, monthRange, todayIn } from './format'
import type { Category, Pot, Profile, Transaction } from './types'

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
