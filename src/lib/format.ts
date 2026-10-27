import type { PaletteKey } from './types'
import { messages, type Lang } from './i18n'

/** 3012250 -> "3,012,250" */
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** 3012250 -> "3,012,250"; 1250.5 -> "1,250.50" (cents only when there are some). */
export const fmt = (n: number) => {
  const cents = Math.round(Math.abs(n) * 100)
  const sign = n < 0 && cents > 0 ? '-' : ''
  const whole = group(String(Math.floor(cents / 100)))
  const rest = cents % 100
  return rest ? `${sign}${whole}.${String(rest).padStart(2, '0')}` : `${sign}${whole}`
}

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

/** "Mon, Oct 27" / "lun. 27 oct." */
export function shortDate(iso: string, lang: Lang) {
  const d = parseIso(iso)
  const t = messages(lang).date
  return t.short(t.days[d.getDay()], d.getDate(), t.months[d.getMonth()])
}

/** "Monday, October 27, 2026" / "lundi 27 octobre 2026" */
export function fullDate(iso: string, lang: Lang) {
  const d = parseIso(iso)
  const t = messages(lang).date
  return t.full(t.longDays[d.getDay()], d.getDate(), t.longMonths[d.getMonth()], d.getFullYear())
}

export function dayLabel(iso: string, today: string, lang: Lang) {
  if (iso === today) return messages(lang).date.today
  if (iso === addDays(today, -1)) return messages(lang).date.yesterday
  return shortDate(iso, lang)
}

export const monthShort = (iso: string, lang: Lang) => messages(lang).date.months[parseIso(iso).getMonth()]
export const monthLong = (iso: string, lang: Lang) => messages(lang).date.longMonths[parseIso(iso).getMonth()]
export const weekdayLong = (iso: string, lang: Lang) => messages(lang).date.longDays[parseIso(iso).getDay()]

/** "October 2026" / "Octobre 2026" */
export function monthLabel(iso: string, lang: Lang) {
  return messages(lang).date.monthYear(monthLong(iso, lang), parseIso(iso).getFullYear())
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

/** "Oct 2026" / "oct. 2026" */
export function sinceLabel(iso: string, lang: Lang) {
  return `${monthShort(iso, lang)} ${parseIso(iso).getFullYear()}`
}

export const tint = (k: PaletteKey) => ({
  color: `var(--pal-${k})`,
  background: `color-mix(in oklab, var(--pal-${k}) 14%, transparent)`,
})

export function greetingFor(hour: number, lang: Lang) {
  const t = messages(lang).greeting
  if (hour >= 5 && hour < 12) return t.morning
  if (hour >= 12 && hour < 18) return t.afternoon
  return t.evening
}

export function greeting(timeZone: string, lang: Lang) {
  return greetingFor(Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date())), lang)
}

/** Minutes since local midnight in the given IANA time zone. */
export function minutesIn(timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  )
  return Number(p.hour) * 60 + Number(p.minute)
}

export const timeToMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
