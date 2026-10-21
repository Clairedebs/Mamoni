import Link from 'next/link'
import { Suspense } from 'react'
import { AddButton } from '@/components/AppShell'
import { BalanceCard } from '@/components/BalanceCard'
import { Icon } from '@/components/Icon'
import { Greeting } from '@/components/Greeting'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TontineStatusLine } from '@/components/TontineStatusLine'
import { FlowChart, Money, SavingsBar, Skeleton, Tile, TxRow } from '@/components/ui'
import {
  daysSinceLastEntry, getCategories, getLifetimeTotals, getMonthlyFlows, getPots, getProfile, getToday, getTontineGroups, getTransactions, sumBy,
} from '@/lib/data'
import { LONG_MONTHS, MONTHS, greeting, monthRange, parseIso } from '@/lib/format'

export default function HomePage() {
  return (
    <section className="view" aria-label="Home">
      <Suspense fallback={<HomeSkeleton />}>
        <Home />
      </Suspense>
    </section>
  )
}

async function Home() {
  const [profile, today, cats, pots, totals] = await Promise.all([getProfile(), getToday(), getCategories(), getPots(), getLifetimeTotals()])
  const { start, end } = monthRange(today)
  const [monthTx, flows, since, recent, tontines] = await Promise.all([
    getTransactions({ from: start, to: end }),
    getMonthlyFlows(today),
    daysSinceLastEntry(today),
    getTransactions({ limit: 5 }),
    getTontineGroups(),
  ])
  const activeTontines = tontines.filter((v) => v.group.status === 'active')

  const savings = pots.reduce((a, p) => a + Number(p.balance), 0)
  const available = Number(profile.opening_cash) + totals.income - totals.expense - totals.deposit + totals.withdrawal
  const income = sumBy(monthTx, 'income')
  const expense = sumBy(monthTx, 'expense')
  const left = income - expense - sumBy(monthTx, 'deposit') + sumBy(monthTx, 'withdrawal')
  const monthName = MONTHS[parseIso(today).getMonth()]
  const name = profile.display_name || 'there'

  const byCat = cats
    .filter((c) => c.kind === 'expense')
    .map((c) => ({ c, v: monthTx.filter((t) => t.category_id === c.id).reduce((a, t) => a + Number(t.amount), 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
  const maxCat = byCat[0]?.v || 1
  const groups = cats
    .filter((c) => c.kind === 'saving')
    .map((cat) => ({ cat, total: pots.filter((p) => p.category_id === cat.id).reduce((a, p) => a + Number(p.balance), 0) }))

  return (
    <>
      <header className="top">
        <div className="avatar" aria-hidden="true">
          {name[0]?.toUpperCase()}
        </div>
        <div className="grow">
          <div className="sub">
            <Greeting initial={greeting(profile.timezone)} />
          </div>
          <h1>{name}</h1>
        </div>
        <span className="m-only">
          <ThemeToggle variant="icon" />
        </span>
        <Link className="icon-btn" href="/settings" aria-label="Reminder settings">
          <Icon name="bell" />
          {since !== null && since >= 2 && <span className="dot" />}
        </Link>
      </header>

      <div className="home-grid">
        <div className="col-l">
          <BalanceCard available={available} savings={savings} income={income} expense={expense} month={monthName} />

          {since === null ? (
            <div className="remind" role="status">
              <Icon name="sparkles" />
              <div className="t">
                <b>Welcome to Moni yem</b>Log your first expense or income to get started.
              </div>
              <AddButton className="btn-sm">Add one</AddButton>
            </div>
          ) : (
            since >= 2 && (
              <div className="remind" role="status">
                <Icon name="bell-ring" />
                <div className="t">
                  <b>{since} days without an entry</b>Log your spending to keep your numbers accurate.
                </div>
                <AddButton className="btn-sm">Update now</AddButton>
              </div>
            )
          )}

          <div className="section-h">
            <h2>Tontines</h2>
            <Link className="link" href="/tontines">
              {activeTontines.length ? 'See all' : 'Track a tontine'}
            </Link>
          </div>
          {activeTontines.length > 0 && (
            <div className="panel" style={{ padding: '6px 16px 8px' }}>
              <div className="list">
                {activeTontines.map((v) => (
                  <TontineStatusLine key={v.group.id} view={v} />
                ))}
              </div>
            </div>
          )}

          <div className="section-h">
            <h2>Income &amp; spending</h2>
            <span className="muted d-only" style={{ fontSize: 13 }}>
              Last 6 months
            </span>
          </div>
          <div className="panel">
            <div className="chart-h">
              <div>
                <small className="muted">Left this month</small>
                <strong className="num">
                  <Money n={Math.abs(left)} sign={left < 0 ? '−' : ''} />
                </strong>
              </div>
              <div className="keys">
                <span>
                  <i style={{ background: 'var(--brand)' }} />
                  Income
                </span>
                <span>
                  <i style={{ background: 'var(--line-strong)' }} />
                  Spending
                </span>
              </div>
            </div>
            <FlowChart data={flows} />
          </div>

          <div className="section-h">
            <h2>Where your money goes</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {LONG_MONTHS[parseIso(today).getMonth()]}
            </span>
          </div>
          <div className="panel">
            {byCat.length ? (
              <div className="cats">
                {byCat.slice(0, 5).map(({ c, v }) => (
                  <div key={c.id} className="cat">
                    <Tile icon={c.icon} color={c.color} />
                    <b>{c.name}</b>
                    <span className="v num">
                      <Money n={v} />
                    </span>
                    <span className="track">
                      <i style={{ width: `${(v / maxCat) * 100}%`, background: `var(--pal-${c.color})` }} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint">No spending logged this month yet.</p>
            )}
          </div>
        </div>

        <div className="col-r">
          <div className="section-h">
            <h2>My savings</h2>
            <Link className="link" href="/savings">
              See all
            </Link>
          </div>
          <div className="panel">
            <div className="sv-total">
              <span className="muted">Total saved</span>
              <strong className="num">
                <Money n={savings} />
              </strong>
            </div>
            {pots.length ? (
              <SavingsBar groups={groups} total={savings} />
            ) : (
              <p className="hint" style={{ marginTop: 10 }}>
                No pots yet. <Link className="link" href="/savings/pots/new">Create your first pot</Link>
              </p>
            )}
          </div>

          <div className="section-h">
            <h2>Recent activity</h2>
            <Link className="link" href="/activity">
              See all
            </Link>
          </div>
          <div className="panel" style={{ padding: '6px 16px 8px' }}>
            {recent.length ? (
              <div className="list">
                {recent.map((t) => (
                  <TxRow key={t.id} t={t} cats={cats} pots={pots} />
                ))}
              </div>
            ) : (
              <p className="hint" style={{ padding: '12px 0' }}>
                Nothing yet. Tap + to add your first transaction.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function HomeSkeleton() {
  return (
    <>
      <header className="top">
        <div className="avatar" />
        <div className="grow">
          <Skeleton h={14} style={{ width: 90, marginBottom: 6 }} />
          <Skeleton h={22} style={{ width: 140 }} />
        </div>
      </header>
      <div className="home-grid">
        <div className="col-l stack">
          <Skeleton h={210} style={{ borderRadius: 26 }} />
          <Skeleton h={240} style={{ borderRadius: 22 }} />
        </div>
        <div className="col-r stack">
          <Skeleton h={160} style={{ borderRadius: 22 }} />
          <Skeleton h={300} style={{ borderRadius: 22 }} />
        </div>
      </div>
    </>
  )
}
