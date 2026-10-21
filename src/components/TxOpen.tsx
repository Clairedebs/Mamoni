'use client'

import { useAddSheet } from './AppShell'
import type { Transaction } from '@/lib/types'

/** A transaction row that opens its detail sheet. */
export function TxOpen({ t, label, children }: { t: Transaction; label: string; children: React.ReactNode }) {
  const { openDetail } = useAddSheet()
  return (
    <button type="button" className="row" aria-haspopup="dialog" aria-label={label} onClick={() => openDetail(t)}>
      {children}
    </button>
  )
}
