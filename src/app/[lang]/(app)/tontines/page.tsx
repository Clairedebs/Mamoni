import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { TontineStatusLine } from '@/components/TontineStatusLine'
import { Skeleton } from '@/components/ui'
import { getTontineGroups } from '@/lib/data'
import { fmt } from '@/lib/format'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.tontines }
}

export default async function TontinesPage() {
  const t = (await getT()).tontines
  return (
    <section className="view" aria-label={t.title}>
      <div className="set-wrap">
        <header className="top">
          <div className="grow">
            <h1>{t.title}</h1>
          </div>
          <Link className="btn-sm" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }} href="/tontines/new">
            <Icon name="plus" size={15} />
            {t.newGroup}
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
  const [views, { tontines: t }] = await Promise.all([getTontineGroups(), getT()])
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
          <b>{t.noGroups}</b>
          <p>{t.noGroupsBody}</p>
          <Link className="btn" href="/tontines/new">
            <Icon name="plus" />
            {t.add}
          </Link>
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="section-h">
            <h2>{t.past}</h2>
          </div>
          <div className="set-group">
            {past.map((v) => {
              const diff = v.collected - v.paidTotal
              const credit = v.coverage.credit + v.coverage.extraCredit
              return (
                <Link key={v.group.id} className="set-row" href={`/tontines/${v.group.id}`}>
                  <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                    <Icon name="flag" />
                  </span>
                  <div className="mid">
                    <b>{v.group.name}</b>
                    <small>
                      {t.pastSummary(fmt(v.paidTotal), fmt(v.collected), `${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))}`)}
                      {credit > 0 ? t.credit(fmt(credit)) : ''}
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
