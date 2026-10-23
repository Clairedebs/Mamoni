'use client'

import { useAddSheet } from './AppShell'
import { useCurrency } from './currency'
import type { Transaction } from '@/lib/types'

/** A transaction row that opens its detail sheet. */
export function TxOpen({ t, title, amountText, children }: { t: Transaction; title: string; amountText: string; children: React.ReactNode }) {
  const { openDetail } = useAddSheet()
  const cur = useCurrency()
  return (
    <button type="button" className="row" aria-haspopup="dialog" aria-label={`${title}, ${amountText} ${cur.symbol}, open details`} onClick={() => openDetail(t)}>
      {children}
    </button>
  )
}
