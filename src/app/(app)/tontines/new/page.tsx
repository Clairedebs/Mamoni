import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { TontineForm } from '@/components/TontineForm'
import { Skeleton } from '@/components/ui'
import { getTontineGroup, getToday } from '@/lib/data'

export const metadata: Metadata = { title: 'New tontine' }

type SP = Promise<{ from?: string }>

export default function NewTontinePage({ searchParams }: { searchParams: SP }) {
  return (
    <section className="view" aria-label="New tontine">
      <div className="set-wrap">
        <Link className="back" href="/tontines">
          <Icon name="chevron-left" />
          Tontines
        </Link>
        <Suspense fallback={<Skeleton h={560} style={{ borderRadius: 22, marginTop: 16 }} />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}

async function Form({ searchParams }: { searchParams: SP }) {
  const [{ from }, today] = await Promise.all([searchParams, getToday()])
  const source = from ? await getTontineGroup(from) : null
  return (
    <>
      <header className="top" style={{ paddingTop: 8 }}>
        <div className="grow">
          <h1>{source ? 'New round' : 'New tontine'}</h1>
        </div>
      </header>
      <TontineForm today={today} from={source ?? undefined} />
    </>
  )
}
