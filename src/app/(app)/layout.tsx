import { Suspense } from 'react'
import { AppShell } from '@/components/AppShell'
import { AddSheet } from '@/components/AddSheet'
import { getCategories, getPots, getToday } from '@/lib/data'

async function SheetLoader() {
  const [categories, pots, today] = await Promise.all([getCategories(), getPots(), getToday()])
  return <AddSheet categories={categories} pots={pots} today={today} />
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
