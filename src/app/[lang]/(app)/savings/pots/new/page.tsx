import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { PotForm } from '@/components/PotForm'
import { Skeleton } from '@/components/ui'
import { getCategories, getToday } from '@/lib/data'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.newPot }
}

export default async function NewPotPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.meta.newPot}>
      <div className="set-wrap">
        <Link className="back" href="/savings">
          <Icon name="chevron-left" />
          {t.savings.title}
        </Link>
        <header className="top" style={{ paddingTop: 8 }}>
          <div className="grow">
            <h1>{t.meta.newPot}</h1>
          </div>
        </header>
        <Suspense fallback={<Skeleton h={420} style={{ borderRadius: 22 }} />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}

async function Form({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, cats, today] = await Promise.all([searchParams, getCategories(), getToday()])
  return <PotForm cats={cats.filter((c) => c.kind === 'saving')} categoryId={category} today={today} />
}
