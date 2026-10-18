import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SettingsForm } from '@/components/SettingsForm'
import { Skeleton } from '@/components/ui'
import { getCategories, getPots, getProfile, getToday } from '@/lib/data'
import { requireUser } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <section className="view" aria-label="Settings">
      <header className="top">
        <div className="grow">
          <h1>Settings</h1>
        </div>
      </header>
      <Suspense fallback={<Skeleton h={520} style={{ borderRadius: 22, maxWidth: 720 }} />}>
        <Settings />
      </Suspense>
    </section>
  )
}

async function Settings() {
  const [{ email }, profile, cats, pots, today] = await Promise.all([requireUser(), getProfile(), getCategories(), getPots(), getToday()])
  const contribution = cats.find((c) => c.kind === 'saving' && c.icon === 'hand-coins')
  const contributionPots = pots.filter((p) => p.due_date || p.category_id === contribution?.id)
  const counts = { expense: 0, income: 0, saving: 0 }
  cats.forEach((c) => counts[c.kind]++)
  return <SettingsForm profile={profile} contributionPots={contributionPots} counts={counts} today={today} email={email} />
}
