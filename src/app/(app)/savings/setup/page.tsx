import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { SetupForm } from '@/components/SetupForm'
import { Skeleton } from '@/components/ui'
import { getCategories, getPots, getProfile } from '@/lib/data'

export const metadata: Metadata = { title: 'Starting balances' }

type SP = Promise<{ welcome?: string }>

export default function SetupPage({ searchParams }: { searchParams: SP }) {
  return (
    <section className="view" aria-label="Starting balances">
      <div className="setup-wrap">
        <Link className="back" href="/savings">
          <Icon name="chevron-left" />
          Savings
        </Link>
        <header className="top" style={{ paddingTop: 8 }}>
          <div className="grow">
            <h1>What you already have</h1>
          </div>
        </header>
        <p className="setup-intro">Enter what you have today. Your deposits, withdrawals and spending will be added on top.</p>
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
