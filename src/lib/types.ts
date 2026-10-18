export type CategoryKind = 'expense' | 'income' | 'saving'
export type TransactionKind = 'expense' | 'income' | 'deposit' | 'withdrawal'
export type Repeat = 'weekly' | 'monthly' | 'once'
export type ReminderFrequency = 'daily' | 'thrice_weekly' | 'weekly'

export const PALETTE = ['violet', 'purple', 'blue', 'cyan', 'teal', 'green', 'amber', 'orange', 'coral', 'red', 'pink', 'slate'] as const
export type PaletteKey = (typeof PALETTE)[number]

export type Category = {
  id: string
  kind: CategoryKind
  name: string
  icon: string
  color: PaletteKey
  description: string | null
  is_default: boolean
  position: number
}

export type Pot = {
  id: string
  category_id: string
  name: string
  note: string | null
  initial_amount: number
  started_on: string
  goal_amount: number | null
  due_date: string | null
  repeat: Repeat
  balance: number
}

export type Transaction = {
  id: string
  kind: TransactionKind
  amount: number
  category_id: string | null
  pot_id: string | null
  occurred_on: string
  note: string | null
  created_at: string
}

export type Profile = {
  id: string
  display_name: string | null
  currency: string
  timezone: string
  opening_cash: number
  reminder_enabled: boolean
  reminder_frequency: ReminderFrequency
  reminder_time: string
  nudge_enabled: boolean
  contribution_enabled: boolean
  contribution_lead_days: number
}
