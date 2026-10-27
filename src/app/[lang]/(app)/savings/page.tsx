import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { Money, SavingsBar, SavingsLine, Skeleton, Tile } from '@/components/ui'
import { getCategories, getPots, getSavingsHistory, getToday } from '@/lib/data'
import { fmt } from '@/lib/format'
import { getLang, getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.savings }
}

export default async function SavingsPage() {
  const t = await getT()
  return (
    <section className="view" aria-label={t.savings.title}>
      <header className="top">
        <div className="grow">
          <h1>{t.savings.title}</h1>
        </div>
        <Link className="btn-sm" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }} href="/tontines">
          <Icon name="hand-coins" size={15} />
          {t.tontines.title}
        </Link>
        <Link className="btn-sm" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }} href="/savings/setup">
          <Icon name="pencil" size={15} />
          {t.savings.balances}
        </Link>
      </header>
      <Suspense fallback={<SavingsSkeleton />}>
        <Savings />
      </Suspense>
    </section>
  )
}

async function Savings() {
  const [today, lang, t] = await Promise.all([getToday(), getLang(), getT()])
  const [cats, pots, history] = await Promise.all([getCategories(), getPots(), getSavingsHistory(today)])
  const savingCats = cats.filter((c) => c.kind === 'saving')
  const total = pots.reduce((a, p) => a + Number(p.balance), 0)
  const initial = pots.reduce((a, p) => a + Number(p.initial_amount), 0)
  const groups = savingCats.map((cat) => ({ cat, total: pots.filter((p) => p.category_id === cat.id).reduce((a, p) => a + Number(p.balance), 0) }))
  const gained = total - initial

  return (
    <>
      <div className="home-grid">
        <div className="panel sv-hero">
          <small className="muted">{t.savings.total}</small>
          <div className="big num">
            <Money n={total} />
          </div>
          {pots.length > 0 && (
            <span className="delta" style={gained < 0 ? { color: 'var(--neg)', background: 'color-mix(in oklab,var(--neg) 12%,transparent)' } : undefined}>
              <Icon name="trending-up" />
              {gained >= 0 ? '+' : '−'}
              {fmt(Math.abs(gained))} <span className="cur" /> {t.savings.sinceStart}
            </span>
          )}
          <div style={{ marginTop: 16 }}>{pots.length > 0 ? <SavingsLine points={history} lang={lang} /> : null}</div>
        </div>
        <div className="panel">
          <div className="sv-total">
            <span className="muted">{t.savings.breakdown}</span>
          </div>
          <SavingsBar groups={groups} total={total} />
        </div>
      </div>

      <div className="sv-groups">
        {savingCats.map((g) => {
          const mine = pots.filter((p) => p.category_id === g.id)
          return (
            <div key={g.id} className="group">
              <div className="group-h">
                <Tile icon={g.icon} color={g.color} />
                <div className="t">
                  <b>{g.name}</b>
                  <small>{g.description ?? ''}</small>
                </div>
                <div className="v num">
                  <Money n={mine.reduce((a, p) => a + Number(p.balance), 0)} />
                </div>
              </div>
              {mine.length === 0 && (
                <p className="hint" style={{ padding: '4px 0 8px' }}>
                  {t.savings.noPots}
                </p>
              )}
              {mine.map((p) => {
                const added = Number(p.balance) - Number(p.initial_amount)
                return (
                  <Link key={p.id} className="pocket" href={`/savings/${p.id}`}>
                    <span className="mid">
                      <b>{p.name}</b>
                      <small>{p.note ?? ' '}</small>
                      {p.goal_amount ? (
                        <span className="mini-track">
                          <i style={{ width: `${Math.min(100, (Number(p.balance) / Number(p.goal_amount)) * 100)}%`, background: `var(--pal-${g.color})` }} />
                        </span>
                      ) : null}
                    </span>
                    <span className="r">
                      <strong className="num">
                        <Money n={Number(p.balance)} />
                      </strong>
                      <small className="num" style={added < 0 ? { color: 'var(--neg)' } : undefined}>
                        {added ? `${added > 0 ? '+' : '−'}${fmt(Math.abs(added))}` : '—'}
                      </small>
                    </span>
                  </Link>
                )
              })}
              <Link className="pocket" style={{ color: 'var(--brand-ink)', fontWeight: 560, gap: 10 }} href={`/savings/pots/new?category=${g.id}`}>
                <Icon name="plus" size={18} />
                {t.savings.addPot(g.name)}
              </Link>
            </div>
          )
        })}
      </div>
    </>
  )
}

function SavingsSkeleton() {
  return (
    <div className="stack">
      <div className="home-grid">
        <Skeleton h={230} style={{ borderRadius: 22 }} />
        <Skeleton h={160} style={{ borderRadius: 22 }} />
      </div>
      <Skeleton h={220} style={{ borderRadius: 22 }} />
    </div>
  )
}
