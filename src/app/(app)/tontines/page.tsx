import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { TontineStatusLine } from '@/components/TontineStatusLine'
import { Skeleton } from '@/components/ui'
import { getTontineGroups } from '@/lib/data'
import { fmt } from '@/lib/format'

export const metadata: Metadata = { title: 'Tontines' }

export default function TontinesPage() {
  return (
    <section className="view" aria-label="Tontines">
      <div className="set-wrap">
        <header className="top">
          <div className="grow">
            <h1>Tontines</h1>
          </div>
          <Link className="btn-sm" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }} href="/tontines/new">
            <Icon name="plus" size={15} />
            New group
          </Link>
        </header>
        <Suspense fallback={<Skeleton h={220} style={{ borderRadius: 22 }} />}>
          <Groups />
        </Suspense>
      </div>
    </section>
  )
}

async function Groups() {
  const views = await getTontineGroups()
  const active = views.filter((v) => v.group.status === 'active')
  const past = views.filter((v) => v.group.status === 'ended')

  return (
    <>
      {active.length ? (
        <div className="panel" style={{ padding: '6px 16px 8px' }}>
          <div className="list">
            {active.map((v) => (
              <TontineStatusLine key={v.group.id} view={v} />
            ))}
          </div>
        </div>
      ) : (
        <div className="panel empty-card">
          <span className="tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
            <Icon name="hand-coins" />
          </span>
          <b>No groups yet</b>
          <p>Add your tontine to know at a glance how far ahead you&apos;ve paid.</p>
          <Link className="btn" href="/tontines/new">
            <Icon name="plus" />
            Add a tontine
          </Link>
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="section-h">
            <h2>Past cycles</h2>
          </div>
          <div className="set-group">
            {past.map((v) => {
              const diff = v.collected - v.paidTotal
              return (
                <Link key={v.group.id} className="set-row" href={`/tontines/${v.group.id}`}>
                  <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                    <Icon name="flag" />
                  </span>
                  <div className="mid">
                    <b>{v.group.name}</b>
                    <small>
                      Paid {fmt(v.paidTotal)} · Collected {fmt(v.collected)} · {diff >= 0 ? '+' : '−'}
                      {fmt(Math.abs(diff))}
                    </small>
                  </div>
                  <span className="val">
                    <Icon name="chevron-right" />
                  </span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
