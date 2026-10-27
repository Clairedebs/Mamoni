'use server'

import { refresh } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import webpush from 'web-push'
import { createClient, requireUser } from './supabase/server'
import { getToday } from './data'
import { validateTxEdit } from './tx'
import { CURRENCIES, isMoney } from './currencies'
import { PALETTE, type CategoryKind, type PaletteKey, type ReminderFrequency, type TransactionKind } from './types'
import { ICON_NAMES } from '@/components/icon-names'
import { LANG_COOKIE, isLang, messages, type Messages } from './i18n'
import { requestLang, requestT } from './i18n/server'

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string }
const fail = (error: string): Result<never> => ({ ok: false, error })
const ISO = /^\d{4}-\d{2}-\d{2}$/
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '')
const amountOk = (n: unknown): n is number => typeof n === 'number' && isMoney(n)
const zeroOrMoney = (n: unknown) => n === 0 || amountOk(n)

function dbError(e: { code?: string; message: string }, t: Messages) {
  if (e.code === '23505') return t.errors.duplicateName
  if (e.code === '23503') return t.errors.stillUsed
  return t.errors.generic
}

// ---------------------------------------------------------------- auth
export async function signIn(_: unknown, form: FormData): Promise<Result | undefined> {
  const [supabase, t] = await Promise.all([createClient(), requestT()])
  const { data: auth, error } = await supabase.auth.signInWithPassword({ email: clean(form.get('email'), 200), password: String(form.get('password') ?? '') })
  if (error) return fail(error.message === 'Invalid login credentials' ? t.errors.wrongCredentials : error.message)
  const { data: profile } = await supabase.from('profiles').select('onboarded_at').eq('id', auth.user.id).single()
  if (profile && !profile.onboarded_at) redirect('/welcome')
  const next = clean(form.get('next'), 200)
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/')
}

export async function signUp(_: unknown, form: FormData): Promise<Result<{ confirm: boolean }>> {
  const [supabase, t] = await Promise.all([createClient(), requestT()])
  const name = clean(form.get('name'), 40)
  const password = String(form.get('password') ?? '')
  if (password.length < 8) return fail(t.errors.shortPassword)
  const origin = (await headers()).get('origin') ?? ''
  const { data, error } = await supabase.auth.signUp({
    email: clean(form.get('email'), 200),
    password,
    options: { data: { name }, emailRedirectTo: origin ? `${origin}/auth/callback` : undefined },
  })
  if (error) return fail(error.message)
  if (data.session) redirect('/welcome')
  return { ok: true, data: { confirm: true } }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/** Marks the welcome tour as done (finished or skipped), so it doesn't open again on its own. */
export async function completeOnboarding(): Promise<Result> {
  const [{ supabase, userId }, lang] = await Promise.all([requireUser(), requestLang()])
  // New accounts keep the language they signed up in, so their reminders arrive in it too.
  const { error } = await supabase.from('profiles').update({ onboarded_at: new Date().toISOString(), language: lang }).eq('id', userId).is('onboarded_at', null)
  if (error) return fail(dbError(error, await requestT()))
  return { ok: true, data: null }
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
  const [{ supabase }, t] = await Promise.all([requireUser(), requestT()])
  if (!amountOk(input.amount)) return fail(t.errors.amount)
  if (!ISO.test(input.occurredOn)) return fail(t.errors.date)
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
  if (error) return fail(dbError(error, t))
  refresh()
  return { ok: true, data: { id: data.id } }
}

export async function deleteTransaction(id: string): Promise<Result> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return fail(dbError(error, await requestT()))
  refresh()
  return { ok: true, data: null }
}

export async function updateTransaction(input: { id: string; amount: number; occurredOn: string; note?: string; categoryId?: string; potId?: string }): Promise<Result> {
  const [{ supabase }, lang] = await Promise.all([requireUser(), requestLang()])
  const t = messages(lang)
  const invalid = validateTxEdit({ amount: input.amount, occurredOn: input.occurredOn, today: await getToday() }, lang)
  if (invalid) return fail(invalid)
  const { data: tx, error: readErr } = await supabase.from('transactions').select('kind, group_id').eq('id', input.id).single()
  if (readErr || !tx) return fail(t.errors.transactionNotFound)
  const patch: Record<string, unknown> = { amount: input.amount, occurred_on: input.occurredOn, note: clean(input.note, 80) || null }
  if (tx.kind === 'deposit' || tx.kind === 'withdrawal') {
    if (input.potId) patch.pot_id = input.potId
  } else if (!tx.group_id && input.categoryId) {
    patch.category_id = input.categoryId
  }
  const { error } = await supabase.from('transactions').update(patch).eq('id', input.id)
  if (error) return fail(dbError(error, t))
  refresh()
  return { ok: true, data: null }
}

/** Puts back a transaction deleted a moment ago (Undo). */
export async function restoreTransaction(t: { kind: TransactionKind; amount: number; category_id: string | null; pot_id: string | null; group_id: string | null; occurred_on: string; note: string | null }): Promise<Result> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('transactions').insert({
    kind: t.kind,
    amount: t.amount,
    category_id: t.category_id,
    pot_id: t.pot_id,
    group_id: t.group_id,
    occurred_on: t.occurred_on,
    note: t.note,
  })
  if (error) return fail(dbError(error, await requestT()))
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
  const [{ supabase }, t] = await Promise.all([requireUser(), requestT()])
  const name = clean(input.name, 24)
  if (!name) return fail(t.errors.categoryName)
  if (!ICON_NAMES.includes(input.icon)) return fail(t.errors.icon)
  if (!PALETTE.includes(input.color)) return fail(t.errors.color)
  const row = { name, icon: input.icon, color: input.color, description: input.kind === 'saving' ? clean(input.description, 48) || null : null }
  const q = input.id
    ? supabase.from('categories').update(row).eq('id', input.id).select('id').single()
    : supabase.from('categories').insert({ ...row, kind: input.kind, position: 1000 }).select('id').single()
  const { data, error } = await q
  if (error) return fail(error.code === '23505' ? t.errors.categoryExists(name) : dbError(error, t))
  refresh()
  return { ok: true, data: { id: data.id } }
}

export async function deleteCategory(id: string): Promise<Result> {
  const [{ supabase }, t] = await Promise.all([requireUser(), requestT()])
  const { data: cat } = await supabase.from('categories').select('role').eq('id', id).single()
  if (cat?.role) return fail(t.categories.neededForTontines)
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return fail(dbError(error, t))
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
  const [{ supabase }, t] = await Promise.all([requireUser(), requestT()])
  const name = clean(input.name, 32)
  if (!name) return fail(t.errors.potName)
  if (!zeroOrMoney(input.initialAmount)) return fail(t.errors.startingBalance)
  if (input.goalAmount && !amountOk(input.goalAmount)) return fail(t.errors.goal)
  if (!ISO.test(input.startedOn)) return fail(t.errors.startDate)
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
  if (error) return fail(dbError(error, t))
  refresh()
  return { ok: true, data: { id: data.id } }
}

export async function deletePot(id: string): Promise<Result> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('pots').delete().eq('id', id)
  if (error) return fail(dbError(error, await requestT()))
  refresh()
  return { ok: true, data: null }
}

export async function saveStartingBalances(input: { openingCash: number; pots: { id: string; initial: number }[] }): Promise<Result> {
  const [{ supabase, userId }, t] = await Promise.all([requireUser(), requestT()])
  const values = [input.openingCash, ...input.pots.map((p) => p.initial)]
  if (values.some((v) => !zeroOrMoney(v))) return fail(t.errors.balances)
  const { error } = await supabase.from('profiles').update({ opening_cash: input.openingCash }).eq('id', userId)
  if (error) return fail(dbError(error, t))
  for (const p of input.pots) {
    const { error: e } = await supabase.from('pots').update({ initial_amount: p.initial }).eq('id', p.id)
    if (e) return fail(dbError(e, t))
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
  const [{ supabase, userId }, t] = await Promise.all([requireUser(), requestT()])
  if (patch.reminder_time && !/^\d{2}:\d{2}$/.test(patch.reminder_time)) return fail(t.errors.time)
  if (patch.contribution_lead_days !== undefined && ![0, 1, 2].includes(patch.contribution_lead_days)) return fail(t.errors.leadTime)
  if (patch.timezone) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: patch.timezone })
    } catch {
      return fail(t.errors.timeZone)
    }
  }
  if (patch.display_name !== undefined) patch.display_name = clean(patch.display_name, 40)
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) return fail(dbError(error, t))
  refresh()
  return { ok: true, data: null }
}

/** Relabels every amount with another currency; the numbers themselves don't change. */
export async function changeCurrency(code: string): Promise<Result> {
  const [{ supabase, userId }, t] = await Promise.all([requireUser(), requestT()])
  if (!CURRENCIES.some((c) => c.code === code)) return fail(t.errors.currency)
  const { error } = await supabase.from('profiles').update({ currency: code }).eq('id', userId)
  if (error) return fail(dbError(error, t))
  refresh()
  return { ok: true, data: null }
}

/** Saves the app language on this device (cookie) and on the account (for push reminders); the page reloads after. */
export async function changeLanguage(lang: string): Promise<Result> {
  const [{ supabase, userId }, t] = await Promise.all([requireUser(), requestT()])
  if (!isLang(lang)) return fail(t.errors.language)
  const { error } = await supabase.from('profiles').update({ language: lang }).eq('id', userId)
  if (error) return fail(dbError(error, t))
  ;(await cookies()).set(LANG_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
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
  const [{ supabase, userId }, t] = await Promise.all([requireUser(), requestT()])
  if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return fail(t.errors.subscription)
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' })
  if (error) return fail(dbError(error, t))
  return { ok: true, data: null }
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  const { supabase } = await requireUser()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return { ok: true, data: null }
}

export async function sendTestNotification(): Promise<Result<{ sent: number }>> {
  const [{ supabase }, t] = await Promise.all([requireUser(), requestT()])
  if (!vapidReady()) return fail(t.errors.pushNotConfigured)
  const { data } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth')
  if (!data?.length) return fail(t.errors.pushFirst)
  let sent = 0
  for (const s of data) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: t.notifications.dailyTitle, body: t.notifications.testBody, url: '/' }),
      )
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
    }
  }
  return sent ? { ok: true, data: { sent } } : fail(t.errors.pushUnreachable)
}
