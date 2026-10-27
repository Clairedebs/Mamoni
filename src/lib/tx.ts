import { isMoney } from './currencies'
import { DEFAULT_LANG, messages, type Lang } from './i18n'

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function validateTxEdit(e: { amount: number; occurredOn: string; today: string }, lang: Lang = DEFAULT_LANG): string | null {
  const t = messages(lang).errors
  if (!isMoney(e.amount)) return t.amount
  if (!ISO.test(e.occurredOn)) return t.date
  if (e.occurredOn > e.today) return t.futureDate
  return null
}
