'use server'

import { refresh } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import webpush from 'web-push'
import { createClient, requireUser } from './supabase/server'
import { PALETTE, type CategoryKind, type PaletteKey, type ReminderFrequency, type TransactionKind } from './types'
import { ICON_NAMES } from '@/components/icon-names'

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string }
const fail = (error: string): Result<never> => ({ ok: false, error })
const ISO = /^\d{4}-\d{2}-\d{2}$/
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '')
const amountOk = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n < 1e10

function dbError(e: { code?: string; message: string }) {
  if (e.code === '23505') return 'That name is already used.'
  if (e.code === '23503') return 'This is still used elsewhere, so it can’t be removed.'
  return 'Something went wrong. Please try again.'
}

// ---------------------------------------------------------------- auth
export async function signIn(_: unknown, form: FormData): Promise<Result | undefined> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: clean(form.get('email'), 200), password: String(form.get('password') ?? '') })
  if (error) return fail(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
  const next = clean(form.get('next'), 200)
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/')
}

export async function signUp(_: unknown, form: FormData): Promise<Result<{ confirm: boolean }>> {
  const supabase = await createClient()
  const name = clean(form.get('name'), 40)
  const password = String(form.get('password') ?? '')
  if (password.length < 8) return fail('Use at least 8 characters for your password.')
  const origin = (await headers()).get('origin') ?? ''
  const { data, error } = await supabase.auth.signUp({
    email: clean(form.get('email'), 200),
    password,
    options: { data: { name }, emailRedirectTo: origin ? `${origin}/auth/callback` : undefined },
  })
  if (error) return fail(error.message)
  if (data.session) redirect('/savings/setup?welcome=1')
  return { ok: true, data: { confirm: true } }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ---------------------------------------------------------------- transactions
export async function addTransaction(input: {
  kind: TransactionKind
  amount: number
  categoryId?: string
  potId?: string
  occurredOn: string
  note?: string
  groupId?: string
}): Promise<Result<{ id: string }>> {
  const { supabase } = await requireUser()
  if (!amountOk(input.amount)) return fail('Enter an amount.')
  if (!ISO.test(input.occurredOn)) return fail('Pick a valid date.')
  const isSaving = input.kind === 'deposit' || input.kind === 'withdrawal'
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      kind: input.kind,
      amount: input.amount,
      category_id: isSaving ? null : input.categoryId,
      pot_id: isSaving ? input.potId : null,
      group_id: isSaving ? null : (input.groupId ?? null),
      occurred_on: input.occurredOn,
      note: clean(input.note, 80) || null,
    })
    .select('id')
    .single()
  if (error) return fail(dbError(error))
  refresh()
  return { ok: true, data: { id: data.id } }
}

export async function deleteTransaction(id: string): Promise<Result> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return fail(dbError(error))
  refresh()
  return { ok: true, data: null }
}

// ---------------------------------------------------------------- categories
export async function saveCategory(input: {
  id?: string
  kind: CategoryKind
  name: string
  icon: string
  color: PaletteKey
  description?: string
}): Promise<Result<{ id: string }>> {
  const { supabase } = await requireUser()
  const name = clean(input.name, 24)
  if (!name) return fail('Give your category a name.')
  if (!ICON_NAMES.includes(input.icon)) return fail('Pick an icon.')
  if (!PALETTE.includes(input.color)) return fail('Pick a color.')
  const row = { name, icon: input.icon, color: input.color, description: input.kind === 'saving' ? clean(input.description, 48) || null : null }
  const q = input.id
    ? supabase.from('categories').update(row).eq('id', input.id).select('id').single()
    : supabase.from('categories').insert({ ...row, kind: input.kind, position: 1000 }).select('id').single()
  const { data, error } = await q
  if (error) return fail(error.code === '23505' ? `You already have a category called “${name}”.` : dbError(error))
  refresh()
  return { ok: true, data: { id: data.id } }
}

export async function deleteCategory(id: string): Promise<Result> {
  const { supabase } = await requireUser()
  const { data: cat } = await supabase.from('categories').select('role').eq('id', id).single()
  if (cat?.role) return fail('Moni yem needs this category for tontines.')
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return fail(dbError(error))
  refresh()
  return { ok: true, data: null }
}

// ---------------------------------------------------------------- pots
export async function savePot(input: {
  id?: string
  categoryId: string
  name: string
  note?: string
  initialAmount: number
  startedOn: string
  goalAmount?: number | null
}): Promise<Result<{ id: string }>> {
  const { supabase } = await requireUser()
  const name = clean(input.name, 32)
  if (!name) return fail('Give your pot a name.')
  if (!Number.isInteger(input.initialAmount) || input.initialAmount < 0) return fail('Starting balance must be 0 or more.')
  if (!ISO.test(input.startedOn)) return fail('Pick a valid start date.')
  const row = {
    category_id: input.categoryId,
    name,
    note: clean(input.note, 60) || null,
    initial_amount: input.initialAmount,
    started_on: input.startedOn,
    goal_amount: input.goalAmount && input.goalAmount > 0 ? input.goalAmount : null,
  }
  const q = input.id
    ? supabase.from('pots').update(row).eq('id', input.id).select('id').single()
    : supabase.from('pots').insert(row).select('id').single()
  const { data, error } = await q
  if (error) return fail(dbError(error))
  refresh()
  return { ok: true, data: { id: data.id } }
}

export async function deletePot(id: string): Promise<Result> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('pots').delete().eq('id', id)
  if (error) return fail(dbError(error))
  refresh()
  return { ok: true, data: null }
}

export async function saveStartingBalances(input: { openingCash: number; pots: { id: string; initial: number }[] }): Promise<Result> {
  const { supabase, userId } = await requireUser()
  const values = [input.openingCash, ...input.pots.map((p) => p.initial)]
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v >= 1e10)) return fail('Amounts must be whole numbers, 0 or more.')
  const { error } = await supabase.from('profiles').update({ opening_cash: input.openingCash }).eq('id', userId)
  if (error) return fail(dbError(error))
  for (const p of input.pots) {
    const { error: e } = await supabase.from('pots').update({ initial_amount: p.initial }).eq('id', p.id)
    if (e) return fail(dbError(e))
  }
  refresh()
  return { ok: true, data: null }
}

// ---------------------------------------------------------------- settings
export async function updateSettings(patch: {
  display_name?: string
  reminder_enabled?: boolean
  reminder_frequency?: ReminderFrequency
  reminder_time?: string
  nudge_enabled?: boolean
  contribution_enabled?: boolean
  contribution_lead_days?: number
  timezone?: string
}): Promise<Result> {
  const { supabase, userId } = await requireUser()
  if (patch.reminder_time && !/^\d{2}:\d{2}$/.test(patch.reminder_time)) return fail('Pick a valid time.')
  if (patch.contribution_lead_days !== undefined && ![0, 1, 2].includes(patch.contribution_lead_days)) return fail('Invalid reminder lead time.')
  if (patch.timezone) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: patch.timezone })
    } catch {
      return fail('Unknown timezone.')
    }
  }
  if (patch.display_name !== undefined) patch.display_name = clean(patch.display_name, 40)
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) return fail(dbError(error))
  refresh()
  return { ok: true, data: null }
}

// ---------------------------------------------------------------- push
function vapidReady() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@example.com', pub, priv)
  return true
}

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<Result> {
  const { supabase, userId } = await requireUser()
  if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return fail('Invalid subscription.')
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' })
  if (error) return fail(dbError(error))
  return { ok: true, data: null }
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  const { supabase } = await requireUser()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return { ok: true, data: null }
}

export async function sendTestNotification(): Promise<Result<{ sent: number }>> {
  const { supabase } = await requireUser()
  if (!vapidReady()) return fail('Push keys are not configured on the server.')
  const { data } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth')
  if (!data?.length) return fail('Turn on notifications on this device first.')
  let sent = 0
  for (const s of data) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: 'Time for a quick check-in?', body: 'This is how your Moni yem reminders will look.', url: '/' }),
      )
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
    }
  }
  return sent ? { ok: true, data: { sent } } : fail('Could not reach this device. Try turning notifications off and on.')
}
