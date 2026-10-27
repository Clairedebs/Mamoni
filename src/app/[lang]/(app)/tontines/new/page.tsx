import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { TontineForm } from '@/components/TontineForm'
import { Skeleton } from '@/components/ui'
import { getTontineGroup, getToday } from '@/lib/data'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.newTontine }
}

type SP = Promise<{ from?: string }>

export default async function NewTontinePage({ searchParams }: { searchParams: SP }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.meta.newTontine}>
      <div className="set-wrap">
        <Link className="back" href="/tontines">
          <Icon name="chevron-left" />
          {t.tontines.title}
        </Link>
        <Suspense fallback={<Skeleton h={560} style={{ borderRadius: 22, marginTop: 16 }} />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}

async function Form({ searchParams }: { searchParams: SP }) {
  const [{ from }, today, t] = await Promise.all([searchParams, getToday(), getT()])
  const source = from ? await getTontineGroup(from) : null
  return (
    <>
      <header className="top" style={{ paddingTop: 8 }}>
        <div className="grow">
          <h1>{source ? t.tontine.newRoundTitle : t.tontine.newTitle}</h1>
        </div>
      </header>
      <TontineForm today={today} from={source ?? undefined} />
    </>
  )
}
