import { Suspense } from 'react'
import { AppShell } from '@/components/AppShell'
import { AddSheet } from '@/components/AddSheet'
import { getCategories, getPots, getTontineGroups, getToday } from '@/lib/data'

async function SheetLoader() {
  const [categories, pots, today, tontines] = await Promise.all([getCategories(), getPots(), getToday(), getTontineGroups()])
  const groups = tontines
    .filter((v) => v.group.status === 'active')
    .map((v) => ({ id: v.group.id, name: v.group.name, perPeriod: v.coverage.perPeriod, frequency: v.group.frequency }))
  return <AddSheet categories={categories} pots={pots} groups={groups} today={today} />
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
