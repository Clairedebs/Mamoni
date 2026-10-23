import { isMoney } from './currencies'

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function validateTxEdit(e: { amount: number; occurredOn: string; today: string }): string | null {
  if (!isMoney(e.amount)) return 'Enter an amount.'
  if (!ISO.test(e.occurredOn)) return 'Pick a valid date.'
  if (e.occurredOn > e.today) return 'The date can’t be in the future.'
  return null
}
