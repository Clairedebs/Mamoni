import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { PotForm } from '@/components/PotForm'
import { Skeleton } from '@/components/ui'
import { getCategories, getToday } from '@/lib/data'

export const metadata: Metadata = { title: 'New pot' }

export default function NewPotPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  return (
    <section className="view" aria-label="New pot">
      <div className="set-wrap">
        <Link className="back" href="/savings">
          <Icon name="chevron-left" />
          Savings
        </Link>
        <header className="top" style={{ paddingTop: 8 }}>
          <div className="grow">
            <h1>New pot</h1>
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
