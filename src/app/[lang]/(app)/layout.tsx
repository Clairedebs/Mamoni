import { Suspense } from 'react'
import { AppShell } from '@/components/AppShell'
import { AddSheet } from '@/components/AddSheet'
import { TxDetailSheet } from '@/components/TxDetailSheet'
import { CurrencySync } from '@/components/currency'
import { getCategories, getPots, getProfile, getTontineGroups, getToday } from '@/lib/data'

async function SheetLoader() {
  const [categories, pots, today, tontines, profile] = await Promise.all([getCategories(), getPots(), getToday(), getTontineGroups(), getProfile()])
  const groups = tontines
    .filter((v) => v.group.status === 'active')
    .map((v) => ({ id: v.group.id, name: v.group.name, perPeriod: v.coverage.perPeriod, frequency: v.group.frequency }))
  const groupNames = Object.fromEntries(tontines.map((v) => [v.group.id, v.group.name]))
  const payoutGroups = Object.fromEntries(tontines.flatMap((v) => v.turns.filter((t) => t.transaction_id).map((t) => [t.transaction_id!, v.group.name])))
  return (
    <>
      <CurrencySync code={profile.currency} />
      <AddSheet categories={categories} pots={pots} groups={groups} today={today} />
      <TxDetailSheet categories={categories} pots={pots} today={today} groupNames={groupNames} payoutGroups={payoutGroups} />
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sheet={
        <Suspense fallback={null}>
          <SheetLoader />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  )
}
