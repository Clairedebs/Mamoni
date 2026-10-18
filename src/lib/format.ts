import type { PaletteKey } from './types'

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 3012250 -> "3,012,250" */
export const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export const pad2 = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
export const parseIso = (s: string) => new Date(`${s}T12:00:00`)
export const addDays = (iso: string, n: number) => {
  const d = parseIso(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function shortDate(iso: string) {
  const d = parseIso(iso)
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function dayLabel(iso: string, today: string) {
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  return shortDate(iso)
}

export function monthLabel(iso: string) {
  const d = parseIso(iso)
  return `${LONG_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function monthRange(iso: string) {
  const d = parseIso(iso)
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { start: isoOf(start), end: isoOf(end) }
}

export function daysUntil(iso: string, today: string) {
  return Math.round((parseIso(iso).getTime() - parseIso(today).getTime()) / 864e5)
}

export function dueIn(iso: string, today: string) {
  const n = daysUntil(iso, today)
  if (n < 0) return 'Overdue'
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  return `Due in ${n} days`
}

export function sinceLabel(iso: string) {
  const d = parseIso(iso)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const tint = (k: PaletteKey) => ({
  color: `var(--pal-${k})`,
  background: `color-mix(in oklab, var(--pal-${k}) 14%, transparent)`,
})

export function greeting(timeZone: string) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(new Date()))
  if (h < 12) return 'Good morning,'
  if (h < 18) return 'Good afternoon,'
  return 'Good evening,'
}
