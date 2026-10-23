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
  role: 'tontine' | 'tontine_payout' | null
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
  group_id: string | null
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
  onboarded_at: string | null
}

export type TontineFrequency = 'weekly' | 'monthly'

export type TontineGroup = {
  id: string
  name: string
  amount_per_name: number
  names_total: number
  names_held: number
  frequency: TontineFrequency
  deadline_time: string
  cycle_start: string
  cycle_end: string
  first_due: string
  anchor_day: number
  opening_credit: number
  payments_offset: number
  reminders_enabled: boolean
  status: 'active' | 'ended'
  ended_on: string | null
  created_at: string
}

export type TontineTurn = {
  id: string
  group_id: string
  turn_on: string
  expected_amount: number
  status: 'upcoming' | 'collected' | 'before_app'
  transaction_id: string | null
}
