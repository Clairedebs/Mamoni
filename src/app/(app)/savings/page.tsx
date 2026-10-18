import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { Money, SavingsBar, SavingsLine, Skeleton, Tile } from '@/components/ui'
import { getCategories, getPots, getSavingsHistory, getToday } from '@/lib/data'
import { fmt } from '@/lib/format'

export const metadata: Metadata = { title: 'Savings' }

export default function SavingsPage() {
  return (
    <section className="view" aria-label="Savings">
      <header className="top">
        <div className="grow">
          <h1>Savings</h1>
        </div>
        <Link className="btn-sm" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }} href="/savings/setup">
          <Icon name="pencil" size={15} />
          Starting balances
        </Link>
      </header>
      <Suspense fallback={<SavingsSkeleton />}>
        <Savings />
      </Suspense>
    </section>
  )
}

async function Savings() {
  const today = await getToday()
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
          <small className="muted">Total savings</small>
          <div className="big num">
            <Money n={total} />
          </div>
          {pots.length > 0 && (
            <span className="delta" style={gained < 0 ? { color: 'var(--neg)', background: 'color-mix(in oklab,var(--neg) 12%,transparent)' } : undefined}>
              <Icon name="trending-up" />
              {gained >= 0 ? '+' : '−'}
              {fmt(Math.abs(gained))} FCFA since you started
            </span>
          )}
          <div style={{ marginTop: 16 }}>{pots.length > 0 ? <SavingsLine points={history} /> : null}</div>
        </div>
        <div className="panel">
          <div className="sv-total">
            <span className="muted">Breakdown</span>
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
                  No pots yet. Add one to start tracking.
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
                Add a {g.name.toLowerCase()} pot
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
