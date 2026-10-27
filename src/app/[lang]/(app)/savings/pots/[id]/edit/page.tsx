import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { PotForm } from '@/components/PotForm'
import { Skeleton } from '@/components/ui'
import { getCategories, getPots, getToday, getTransactions } from '@/lib/data'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.editPot }
}

type P = Promise<{ id: string }>

export default async function EditPotPage({ params }: { params: P }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.meta.editPot}>
      <div className="set-wrap">
        <Suspense fallback={<Skeleton h={480} style={{ borderRadius: 22 }} />}>
          <Form params={params} />
        </Suspense>
      </div>
    </section>
  )
}

async function Form({ params }: { params: P }) {
  const { id } = await params
  const [cats, pots, today, moves, t] = await Promise.all([getCategories(), getPots(), getToday(), getTransactions({ potId: id, limit: 1 }), getT()])
  const pot = pots.find((p) => p.id === id)
  if (!pot) notFound()
  return (
    <>
      <Link className="back" href={`/savings/${id}`}>
        <Icon name="chevron-left" />
        {pot.name}
      </Link>
      <header className="top" style={{ paddingTop: 8 }}>
        <div className="grow">
          <h1>{t.meta.editPot}</h1>
        </div>
      </header>
      <PotForm cats={cats.filter((c) => c.kind === 'saving')} pot={pot} today={today} hasMoves={moves.length > 0} />
    </>
  )
}
