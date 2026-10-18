import { addDays, fmt, isoOf, parseIso } from './format'

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
  const funds = Math.max(0, input.paid + input.openingCredit)
  const per = input.perPeriod
  const covered = Math.min(ds.length, Math.floor(funds / per))
  const fullyPaid = covered === ds.length
  const credit = fullyPaid ? 0 : funds - covered * per
  const extraCredit = fullyPaid ? funds - ds.length * per : 0
  const passed = (d: string) => d < input.today || (d === input.today && input.nowMinutes >= input.deadlineMinutes)
  const missedDeadlines = ds.slice(covered).filter(passed)
  const nextDue = fullyPaid ? null : ds[covered]
  return {
    perPeriod: per,
    coveredUntil: covered > 0 ? ds[covered - 1] : null,
    nextDue,
    nextDueAmount: nextDue ? per - credit : 0,
    credit,
    behindCount: missedDeadlines.length,
    behindAmount: missedDeadlines.length ? missedDeadlines.length * per - credit : 0,
    fullyPaid,
    extraCredit,
    missedDeadlines,
  }
}

export type GroupStatus = { tone: 'ok' | 'soon' | 'late' | 'turn' | 'done'; text: string }

export function statusLine(c: Coverage, opts: { today: string; turnToday: boolean; label: (iso: string) => string }, frequency: Frequency): GroupStatus {
  if (opts.turnToday) return { tone: 'turn', text: 'Your turn today' }
  if (c.behindCount > 0) {
    const unit = frequency === 'weekly' ? 'week' : 'month'
    return { tone: 'late', text: `${c.behindCount} ${unit}${c.behindCount > 1 ? 's' : ''} late · ${fmt(c.behindAmount)} FCFA due` }
  }
  if (c.fullyPaid) return { tone: 'done', text: 'Fully paid for this cycle' }
  if (c.nextDue === addDays(opts.today, 1) || c.nextDue === opts.today) {
    return { tone: 'soon', text: `${fmt(c.nextDueAmount)} FCFA due ${c.nextDue === opts.today ? 'today' : 'tomorrow'}` }
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
  if (!isInt(g.amountPerName, 1, 9_999_999_999)) return 'Enter the amount each name pays.'
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
