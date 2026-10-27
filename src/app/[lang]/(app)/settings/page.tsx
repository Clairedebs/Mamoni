import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SettingsForm } from '@/components/SettingsForm'
import { Skeleton } from '@/components/ui'
import { getCategories, getProfile } from '@/lib/data'
import { getT } from '@/lib/i18n/server'
import { requireUser } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.settings }
}

export default async function SettingsPage() {
  const t = await getT()
  return (
    <section className="view" aria-label={t.meta.settings}>
      <header className="top">
        <div className="grow">
          <h1>{t.meta.settings}</h1>
        </div>
      </header>
      <Suspense fallback={<Skeleton h={520} style={{ borderRadius: 22, maxWidth: 720 }} />}>
        <Settings />
      </Suspense>
    </section>
  )
}

async function Settings() {
  const [{ email }, profile, cats] = await Promise.all([requireUser(), getProfile(), getCategories()])
  const counts = { expense: 0, income: 0, saving: 0 }
  cats.forEach((c) => counts[c.kind]++)
  return <SettingsForm profile={profile} counts={counts} email={email} />
}
