'use client'

import { useAddSheet } from './AppShell'
import { useCurrency } from './currency'
import { useT } from './i18n'
import type { Transaction } from '@/lib/types'

/** A transaction row that opens its detail sheet. */
export function TxOpen({ t, title, amountText, children }: { t: Transaction; title: string; amountText: string; children: React.ReactNode }) {
  const { openDetail } = useAddSheet()
  const cur = useCurrency()
  const m = useT()
  return (
    <button type="button" className="row" aria-haspopup="dialog" aria-label={m.tx.openDetails(title, `${amountText} ${cur.symbol}`)} onClick={() => openDetail(t)}>
      {children}
    </button>
  )
}
