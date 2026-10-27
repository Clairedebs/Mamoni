import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { SetupForm } from '@/components/SetupForm'
import { Skeleton } from '@/components/ui'
import { getCategories, getPots, getProfile } from '@/lib/data'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.balances }
}

type SP = Promise<{ welcome?: string }>

export default async function SetupPage({ searchParams }: { searchParams: SP }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.meta.balances}>
      <div className="setup-wrap">
        <Link className="back" href="/savings">
          <Icon name="chevron-left" />
          {t.savings.title}
        </Link>
        <header className="top" style={{ paddingTop: 8 }}>
          <div className="grow">
            <h1>{t.balances.heading}</h1>
          </div>
        </header>
        <p className="setup-intro">{t.balances.intro}</p>
        <Suspense fallback={<Skeleton h={420} style={{ borderRadius: 22 }} />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}

async function Form({ searchParams }: { searchParams: SP }) {
  const [sp, cats, pots, profile] = await Promise.all([searchParams, getCategories(), getPots(), getProfile()])
  return <SetupForm cats={cats.filter((c) => c.kind === 'saving')} pots={pots} openingCash={Number(profile.opening_cash)} welcome={sp.welcome === '1'} />
}
