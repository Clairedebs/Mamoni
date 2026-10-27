import { addDays, fmt, isoOf, parseIso } from './format'
import { isMoney } from './currencies'
import { DEFAULT_LANG, messages, type Lang } from './i18n'

export type Frequency = 'weekly' | 'monthly'

/** Moves `iso` forward by `n` periods. Monthly steps land on `anchorDay`, clamped to the month's last day. */
export function addPeriods(iso: string, frequency: Frequency, n: number, anchorDay?: number): string {
  if (frequency === 'weekly') return addDays(iso, 7 * n)
  const d = parseIso(iso)
  const day = anchorDay ?? d.getDate()
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return isoOf(new Date(first.getFullYear(), first.getMonth(), Math.min(day, last)))
}

export function deadlines(firstDue: string, cycleEnd: string, frequency: Frequency, anchorDay?: number): string[] {
  const out: string[] = []
  for (let i = 0; i < 1000; i++) {
    const d = addPeriods(firstDue, frequency, i, frequency === 'monthly' ? (anchorDay ?? parseIso(firstDue).getDate()) : undefined)
    if (d > cycleEnd) break
    out.push(d)
  }
  return out
}

export function estimateCycleEnd(cycleStart: string, namesTotal: number, frequency: Frequency): string {
  return addPeriods(cycleStart, frequency, namesTotal - 1)
}

export type Coverage = {
  perPeriod: number
  coveredUntil: string | null
  nextDue: string | null
  nextDueAmount: number
  credit: number
  behindCount: number
  behindAmount: number
  fullyPaid: boolean
  extraCredit: number
  missedDeadlines: string[]
}

export function coverage(input: {
  firstDue: string
  /** When given, the deadline before `firstDue` counts as already covered (it was paid before the app or before a schedule change). */
  cycleStart?: string
  anchorDay?: number
  cycleEnd: string
  frequency: Frequency
  perPeriod: number
  paid: number
  openingCredit: number
  today: string
  nowMinutes: number
  deadlineMinutes: number
}): Coverage {
  const ds = deadlines(input.firstDue, input.cycleEnd, input.frequency, input.anchorDay)
  // Work in whole cents so 0.1-sized contributions add up exactly.
  const funds = Math.max(0, Math.round((input.paid + input.openingCredit) * 100))
  const per = Math.round(input.perPeriod * 100)
  const covered = Math.min(ds.length, Math.floor(funds / per))
  const fullyPaid = covered === ds.length
  const credit = fullyPaid ? 0 : funds - covered * per
  const extraCredit = fullyPaid ? funds - ds.length * per : 0
  const passed = (d: string) => d < input.today || (d === input.today && input.nowMinutes >= input.deadlineMinutes)
  const missedDeadlines = ds.slice(covered).filter(passed)
  const nextDue = fullyPaid ? null : ds[covered]
  return {
    perPeriod: per / 100,
    coveredUntil: covered > 0 ? ds[covered - 1] : priorDeadline(input),
    nextDue,
    nextDueAmount: nextDue ? (per - credit) / 100 : 0,
    credit: credit / 100,
    behindCount: missedDeadlines.length,
    behindAmount: missedDeadlines.length ? (missedDeadlines.length * per - credit) / 100 : 0,
    fullyPaid,
    extraCredit: extraCredit / 100,
    missedDeadlines,
  }
}

function priorDeadline(input: { firstDue: string; cycleStart?: string; frequency: Frequency; anchorDay?: number }): string | null {
  if (!input.cycleStart || input.firstDue <= input.cycleStart) return null
  const prev = addPeriods(input.firstDue, input.frequency, -1, input.frequency === 'monthly' ? (input.anchorDay ?? parseIso(input.firstDue).getDate()) : undefined)
  return prev >= input.cycleStart ? prev : null
}

export type GroupStatus = { tone: 'ok' | 'soon' | 'late' | 'turn' | 'done'; text: string }

export function statusLine(
  c: Coverage,
  opts: { today: string; turnToday: boolean; label: (iso: string) => string; symbol?: string },
  frequency: Frequency,
  lang: Lang = DEFAULT_LANG,
): GroupStatus {
  const t = messages(lang).status
  const money = (n: number) => `${fmt(n)} ${opts.symbol ?? 'FCFA'}`
  if (opts.turnToday) return { tone: 'turn', text: t.turnToday }
  if (c.behindCount > 0) return { tone: 'late', text: t.late(c.behindCount, frequency === 'weekly', money(c.behindAmount)) }
  if (c.fullyPaid) return { tone: 'done', text: t.fullyPaid }
  if (c.nextDue === opts.today) return { tone: 'soon', text: t.dueToday(money(c.nextDueAmount)) }
  if (c.nextDue === addDays(opts.today, 1)) return { tone: 'soon', text: t.dueTomorrow(money(c.nextDueAmount)) }
  if (c.coveredUntil) return { tone: 'ok', text: t.coveredUntil(opts.label(c.coveredUntil)) }
  return { tone: 'ok', text: t.due(opts.label(c.nextDue!)) }
}

/** Starting point for a schedule change: keep what is already covered and the leftover credit. */
export function rebase(c: Coverage): { firstDue: string; openingCredit: number } {
  return { firstDue: c.missedDeadlines[0] ?? c.nextDue ?? c.coveredUntil!, openingCredit: c.credit }
}

export function validatePayout(amount: number, saveAmount: number, lang: Lang = DEFAULT_LANG): string | null {
  const e = messages(lang).errors
  if (!(amount > 0)) return e.payoutAmount
  if (saveAmount < 0 || saveAmount > amount) return e.payoutMax
  return null
}

export type GroupInput = {
  name: string
  amountPerName: number
  namesTotal: number
  namesHeld: number
  frequency: Frequency
  deadlineTime: string
  cycleStart: string
  cycleEnd: string
  firstDue: string
  turns: { turnOn: string; beforeApp: boolean }[]
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max

export function validateGroupInput(g: GroupInput, lang: Lang = DEFAULT_LANG): string | null {
  const e = messages(lang).errors
  if (!g.name.trim()) return e.groupName
  if (!isMoney(g.amountPerName)) return e.amountPerName
  if (!isInt(g.namesTotal, 2, 200)) return e.namesRange
  if (!isInt(g.namesHeld, 1, 200)) return e.heldMin
  if (g.namesHeld > g.namesTotal) return e.heldMax
  if (g.frequency !== 'weekly' && g.frequency !== 'monthly') return e.frequency
  if (!/^\d{2}:\d{2}$/.test(g.deadlineTime)) return e.deadline
  if (![g.cycleStart, g.cycleEnd, g.firstDue].every((d) => ISO.test(d))) return e.dates
  if (g.cycleEnd < g.cycleStart) return e.cycleOrder
  if (g.firstDue < g.cycleStart || g.firstDue > g.cycleEnd) return e.firstDueRange
  if (g.turns.length !== g.namesHeld) return e.turnsCount
  if (g.turns.some((t) => !ISO.test(t.turnOn) || t.turnOn < g.cycleStart || t.turnOn > g.cycleEnd)) return e.turnsRange
  return null
}

export type ReminderPush = { title: string; body: string; url: string; tag: string }

/** Decides which tontine pushes are due now. Pure: the caller sends them and stores the markers. */
export function planTontineReminders(input: {
  groupId: string
  name: string
  coverage: Coverage
  deadlineTime: string
  today: string
  nowMinutes: number
  reminderMinutes: number
  lastDueFor: string | null
  lastBehindFor: string | null
  turns: { id: string; turnOn: string; status: 'upcoming' | 'collected' | 'before_app'; notifiedOn: string | null; expectedAmount: number }[]
  symbol?: string
  lang?: Lang
}): { pushes: ReminderPush[]; dueFor?: string; behindFor?: string; notifiedTurns: string[] } {
  const { coverage: c, today, nowMinutes } = input
  const t = messages(input.lang ?? DEFAULT_LANG).notifications
  const money = (n: number) => `${fmt(n)} ${input.symbol ?? 'FCFA'}`
  const url = `/tontines/${input.groupId}`
  const pushes: ReminderPush[] = []
  const out: { pushes: ReminderPush[]; dueFor?: string; behindFor?: string; notifiedTurns: string[] } = { pushes, notifiedTurns: [] }
  const morning = nowMinutes >= 8 * 60

  const inSlot = nowMinutes >= input.reminderMinutes && nowMinutes - input.reminderMinutes <= 180
  if (inSlot && c.behindCount === 0 && c.nextDue && c.nextDue === addDays(today, 1) && input.lastDueFor !== c.nextDue) {
    pushes.push({ title: t.dueTomorrowTitle(input.name), body: t.dueTomorrowBody(money(c.nextDueAmount), input.deadlineTime), url, tag: `tontine-due-${input.groupId}-${c.nextDue}` })
    out.dueFor = c.nextDue
  }

  const newestMissed = c.missedDeadlines.at(-1)
  if (morning && newestMissed && newestMissed < today && input.lastBehindFor !== newestMissed) {
    pushes.push({ title: t.missedTitle(input.name), body: t.missedBody(money(c.behindAmount)), url, tag: `tontine-behind-${input.groupId}-${newestMissed}` })
    out.behindFor = newestMissed
  }

  if (morning) {
    for (const turn of input.turns) {
      if (turn.status !== 'upcoming' || turn.turnOn !== today || turn.notifiedOn) continue
      pushes.push({ title: t.turnTitle(money(turn.expectedAmount), input.name), body: t.turnBody, url, tag: `tontine-turn-${turn.id}` })
      out.notifiedTurns.push(turn.id)
    }
  }
  return out
}

/** Coverage for a stored group row, given contributions counted since its last schedule change. */
export function groupCoverage(
  g: { first_due: string; cycle_start: string; anchor_day: number; cycle_end: string; frequency: Frequency; amount_per_name: number; names_held: number; opening_credit: number; deadline_time: string },
  paid: number,
  today: string,
  nowMinutes: number,
): Coverage {
  const t = String(g.deadline_time)
  return coverage({
    firstDue: g.first_due,
    cycleStart: g.cycle_start,
    anchorDay: g.anchor_day,
    cycleEnd: g.cycle_end,
    frequency: g.frequency,
    perPeriod: Number(g.amount_per_name) * g.names_held,
    paid,
    openingCredit: Number(g.opening_credit),
    today,
    nowMinutes,
    deadlineMinutes: Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)),
  })
}

/** Rebase only when what she owes per period (or how often) changes, and never once the cycle is fully paid. */
export function rebaseOnEdit(c: Coverage, before: { perPeriod: number; frequency: Frequency }, after: { perPeriod: number; frequency: Frequency }) {
  if (c.fullyPaid) return null
  if (before.perPeriod === after.perPeriod && before.frequency === after.frequency) return null
  const r = rebase(c)
  return r.firstDue ? r : null
}

export function hasTurnToday(turns: { turn_on: string; status: string }[], today: string) {
  return turns.some((t) => t.status === 'upcoming' && t.turn_on === today)
}

export function nextRoundStart(g: { cycle_end: string; frequency: Frequency; anchor_day: number }) {
  return addPeriods(g.cycle_end, g.frequency, 1, g.frequency === 'monthly' ? g.anchor_day : undefined)
}

export function categoryDeleteBlock(c: { role: string | null; usage: number; isLast: boolean; kind: 'expense' | 'income' | 'saving' }, lang: Lang = DEFAULT_LANG): string | null {
  const t = messages(lang).categories
  if (c.role) return t.neededForTontines
  if (c.isLast) return t.lastOfType
  if (c.usage > 0) return t.usedBy(c.usage, c.kind === 'saving')
  return null
}
