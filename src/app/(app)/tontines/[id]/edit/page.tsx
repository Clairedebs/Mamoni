import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { TontineForm } from '@/components/TontineForm'
import { Skeleton } from '@/components/ui'
import { getTontineGroup, getToday } from '@/lib/data'

export const metadata: Metadata = { title: 'Edit tontine' }

type P = Promise<{ id: string }>

export default function EditTontinePage({ params }: { params: P }) {
  return (
    <section className="view" aria-label="Edit tontine">
      <div className="set-wrap">
        <Suspense fallback={<Skeleton h={560} style={{ borderRadius: 22 }} />}>
          <Form params={params} />
        </Suspense>
      </div>
    </section>
  )
}

async function Form({ params }: { params: P }) {
  const { id } = await params
  const [view, today] = await Promise.all([getTontineGroup(id), getToday()])
  if (!view) notFound()
  return (
    <>
      <Link className="back" href={`/tontines/${id}`}>
        <Icon name="chevron-left" />
        {view.group.name}
      </Link>
      <header className="top" style={{ paddingTop: 8 }}>
        <div className="grow">
          <h1>Edit tontine</h1>
        </div>
      </header>
      <TontineForm today={today} group={view} />
    </>
  )
}
