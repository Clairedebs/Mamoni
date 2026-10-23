import { addDays, fmt, isoOf, parseIso } from './format'
import { isMoney } from './currencies'

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

export function statusLine(c: Coverage, opts: { today: string; turnToday: boolean; label: (iso: string) => string; symbol?: string }, frequency: Frequency): GroupStatus {
  const sym = opts.symbol ?? 'FCFA'
  if (opts.turnToday) return { tone: 'turn', text: 'Your turn today' }
  if (c.behindCount > 0) {
    const unit = frequency === 'weekly' ? 'week' : 'month'
    return { tone: 'late', text: `${c.behindCount} ${unit}${c.behindCount > 1 ? 's' : ''} late · ${fmt(c.behindAmount)} ${sym} due` }
  }
  if (c.fullyPaid) return { tone: 'done', text: 'Fully paid for this cycle' }
  if (c.nextDue === addDays(opts.today, 1) || c.nextDue === opts.today) {
    return { tone: 'soon', text: `${fmt(c.nextDueAmount)} ${sym} due ${c.nextDue === opts.today ? 'today' : 'tomorrow'}` }
  }
  if (c.coveredUntil) return { tone: 'ok', text: `Covered until ${opts.label(c.coveredUntil)}` }
  return { tone: 'ok', text: `Due ${opts.label(c.nextDue!)}` }
}

/** Starting point for a schedule change: keep what is already covered and the leftover credit. */
export function rebase(c: Coverage): { firstDue: string; openingCredit: number } {
  return { firstDue: c.missedDeadlines[0] ?? c.nextDue ?? c.coveredUntil!, openingCredit: c.credit }
}

export function validatePayout(amount: number, saveAmount: number): string | null {
  if (!(amount > 0)) return 'Enter the payout amount.'
  if (saveAmount < 0 || saveAmount > amount) return 'You can move at most the payout amount.'
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

export function validateGroupInput(g: GroupInput): string | null {
  if (!g.name.trim()) return 'Give your group a name.'
  if (!isMoney(g.amountPerName)) return 'Enter the amount each name pays.'
  if (!isInt(g.namesTotal, 2, 200)) return 'A group has between 2 and 200 names.'
  if (!isInt(g.namesHeld, 1, 200)) return 'You hold at least one name.'
  if (g.namesHeld > g.namesTotal) return 'You can’t hold more names than the group has.'
  if (g.frequency !== 'weekly' && g.frequency !== 'monthly') return 'Pick weekly or monthly.'
  if (!/^\d{2}:\d{2}$/.test(g.deadlineTime)) return 'Pick a deadline time.'
  if (![g.cycleStart, g.cycleEnd, g.firstDue].every((d) => ISO.test(d))) return 'Pick valid dates.'
  if (g.cycleEnd < g.cycleStart) return 'The cycle end must be after its start.'
  if (g.firstDue < g.cycleStart || g.firstDue > g.cycleEnd) return 'Your next due date must be within the cycle.'
  if (g.turns.length !== g.namesHeld) return 'Add one turn for each name you hold.'
  if (g.turns.some((t) => !ISO.test(t.turnOn) || t.turnOn < g.cycleStart || t.turnOn > g.cycleEnd)) return 'Each turn must fall within the cycle.'
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
}): { pushes: ReminderPush[]; dueFor?: string; behindFor?: string; notifiedTurns: string[] } {
  const { coverage: c, today, nowMinutes } = input
  const sym = input.symbol ?? 'FCFA'
  const url = `/tontines/${input.groupId}`
  const pushes: ReminderPush[] = []
  const out: { pushes: ReminderPush[]; dueFor?: string; behindFor?: string; notifiedTurns: string[] } = { pushes, notifiedTurns: [] }
  const morning = nowMinutes >= 8 * 60

  const inSlot = nowMinutes >= input.reminderMinutes && nowMinutes - input.reminderMinutes <= 180
  if (inSlot && c.behindCount === 0 && c.nextDue && c.nextDue === addDays(today, 1) && input.lastDueFor !== c.nextDue) {
    pushes.push({ title: `${input.name}: payment due tomorrow`, body: `${fmt(c.nextDueAmount)} ${sym} before ${input.deadlineTime}.`, url, tag: `tontine-due-${input.groupId}-${c.nextDue}` })
    out.dueFor = c.nextDue
  }

  const newestMissed = c.missedDeadlines.at(-1)
  if (morning && newestMissed && newestMissed < today && input.lastBehindFor !== newestMissed) {
    pushes.push({ title: `${input.name}: payment missed`, body: `${fmt(c.behindAmount)} ${sym} is due.`, url, tag: `tontine-behind-${input.groupId}-${newestMissed}` })
    out.behindFor = newestMissed
  }

  if (morning) {
    for (const t of input.turns) {
      if (t.status !== 'upcoming' || t.turnOn !== today || t.notifiedOn) continue
      pushes.push({ title: `It’s your turn: ${fmt(t.expectedAmount)} ${sym} from ${input.name}`, body: 'Tap to record it and choose how much to save.', url, tag: `tontine-turn-${t.id}` })
      out.notifiedTurns.push(t.id)
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

export function categoryDeleteBlock(c: { role: string | null; usage: number; isLast: boolean; kind: 'expense' | 'income' | 'saving' }): string | null {
  if (c.role) return 'Moni yem needs this category for tontines.'
  if (c.isLast) return 'You need at least one category of this type.'
  if (c.usage > 0) {
    const what = c.kind === 'saving' ? 'pot' : 'transaction'
    return `Used by ${c.usage} ${what}${c.usage > 1 ? 's' : ''}. Move or delete ${c.kind === 'saving' ? 'them' : 'those'} first.`
  }
  return null
}
