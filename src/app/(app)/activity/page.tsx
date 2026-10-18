import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ActivityControls } from '@/components/ActivityControls'
import { Icon } from '@/components/Icon'
import { Money, Skeleton, TxRow, describe } from '@/components/ui'
import { getCategories, getPots, getToday, getTransactions, sumBy } from '@/lib/data'
import { dayLabel, fmt, monthLabel, monthRange, parseIso } from '@/lib/format'

export const metadata: Metadata = { title: 'Activity' }

type SP = Promise<{ m?: string; f?: string; q?: string }>

export default function ActivityPage({ searchParams }: { searchParams: SP }) {
  return (
    <section className="view" aria-label="Activity">
      <div className="ops-wrap">
        <Suspense fallback={<ActivitySkeleton />}>
          <Activity searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}

const shift = (iso: string, n: number) => {
  const d = parseIso(iso)
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
}

async function Activity({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const today = await getToday()
  const thisMonth = today.slice(0, 7)
  const m = sp.m && /^\d{4}-\d{2}$/.test(sp.m) && sp.m <= thisMonth ? sp.m : thisMonth
  const { start, end } = monthRange(`${m}-01`)
  const [txs, cats, pots] = await Promise.all([getTransactions({ from: start, to: end }), getCategories(), getPots()])

  const f = sp.f ?? 'all'
  const q = (sp.q ?? '').trim().toLowerCase()
  const list = txs.filter((t) => {
    const kindOk = f === 'all' || (f === 'saving' ? t.kind === 'deposit' || t.kind === 'withdrawal' : t.kind === f)
    if (!kindOk) return false
    if (!q) return true
    const d = describe(t, cats, pots)
    return [t.note ?? '', d.name, d.group].some((s) => s.toLowerCase().includes(q))
  })

  const days = new Map<string, typeof list>()
  for (const t of list) days.set(t.occurred_on, [...(days.get(t.occurred_on) ?? []), t])
  const saved = sumBy(txs, 'deposit') - sumBy(txs, 'withdrawal')

  return (
    <>
      <ActivityControls month={m} prev={shift(`${m}-01`, -1)} next={m < thisMonth ? shift(`${m}-01`, 1) : null} label={monthLabel(`${m}-01`)} />
      <div className="summary">
        <div>
          <small>Income</small>
          <strong className="num" style={{ color: 'var(--pos)' }}>
            <Money n={sumBy(txs, 'income')} sign="+" />
          </strong>
        </div>
        <div>
          <small>Spending</small>
          <strong className="num">
            <Money n={sumBy(txs, 'expense')} sign="−" />
          </strong>
        </div>
        <div>
          <small>Saved</small>
          <strong className="num">
            <Money n={Math.abs(saved)} sign={saved < 0 ? '−' : ''} />
          </strong>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <Icon name={q ? 'search-x' : 'calendar'} />
          <p>{q ? `No transactions match “${sp.q}”.` : 'No transactions this month.'}</p>
        </div>
      ) : (
        <div className="list">
          {[...days.entries()].map(([d, ts]) => {
            const net = ts.reduce((a, t) => a + (t.kind === 'income' || t.kind === 'withdrawal' ? 1 : -1) * Number(t.amount), 0)
            return (
              <div key={d}>
                <div className="day">
                  <span>{dayLabel(d, today)}</span>
                  <span className="num">
                    {net > 0 ? '+' : '−'}
                    {fmt(Math.abs(net))}
                  </span>
                </div>
                <div className="panel" style={{ padding: '4px 14px' }}>
                  {ts.map((t) => (
                    <TxRow key={t.id} t={t} cats={cats} pots={pots} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function ActivitySkeleton() {
  return (
    <div className="stack" style={{ paddingTop: 8 }}>
      <Skeleton h={36} style={{ width: 160 }} />
      <Skeleton h={46} />
      <Skeleton h={40} />
      <Skeleton h={64} />
      <Skeleton h={220} style={{ borderRadius: 22 }} />
    </div>
  )
}
