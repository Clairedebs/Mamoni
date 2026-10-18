import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AddButton } from '@/components/AppShell'
import { CollectPayoutSheet } from '@/components/CollectPayoutSheet'
import { Icon } from '@/components/Icon'
import { EndCycle, RemindersSwitch } from '@/components/TontineControls'
import { Money, Skeleton, TxRow } from '@/components/ui'
import { getCategories, getPots, getTontineGroup, getToday, getTransactions } from '@/lib/data'
import { dayLabel, fmt, shortDate, tint } from '@/lib/format'
import type { TontineTurn } from '@/lib/types'

type P = Promise<{ id: string }>

export default function TontinePage({ params }: { params: P }) {
  return (
    <section className="view" aria-label="Tontine">
      <Link className="back" href="/tontines">
        <Icon name="chevron-left" />
        Tontines
      </Link>
      <Suspense
        fallback={
          <div className="pd-grid" style={{ marginTop: 8 }}>
            <Skeleton h={300} style={{ borderRadius: 26 }} />
            <Skeleton h={260} style={{ borderRadius: 22 }} />
          </div>
        }
      >
        <Group params={params} />
      </Suspense>
    </section>
  )
}

const TURN_LABEL: Record<TontineTurn['status'], string> = { upcoming: 'Upcoming', collected: 'Collected', before_app: 'Before the app' }

async function Group({ params }: { params: P }) {
  const { id } = await params
  const [view, today, cats, pots, txs] = await Promise.all([getTontineGroup(id), getToday(), getCategories(), getPots(), getTransactions()])
  if (!view) notFound()
  const { group: g, coverage: c, status } = view
  const active = g.status === 'active'
  const tontineCat = cats.find((x) => x.role === 'tontine')
  const unit = g.frequency === 'weekly' ? 'week' : 'month'
  const per = c.perPeriod
  const payments = txs.filter((t) => t.group_id === g.id)
  const tone = status.tone === 'late' ? 'red' : status.tone === 'turn' ? 'violet' : status.tone === 'soon' ? 'amber' : status.tone === 'done' ? 'slate' : 'teal'

  return (
    <div className="pd-grid" style={{ marginTop: 8 }}>
      <div>
        <div className="pd-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span className="chip" style={tint(tone)}>
              <Icon name="hand-coins" />
              {active ? `${fmt(per)} FCFA per ${unit}` : 'Past cycle'}
            </span>
            {active && (
              <Link className="btn-sm" style={{ background: 'var(--surface-2)' }} href={`/tontines/${g.id}/edit`}>
                <Icon name="pencil" size={14} />
                Edit
              </Link>
            )}
          </div>
          <h2>{g.name}</h2>
          <small className="muted">
            {g.names_held} of {g.names_total} names · {shortDate(g.cycle_start)} – {shortDate(g.cycle_end)}
          </small>
          <div className="big" style={{ fontSize: 'clamp(24px,6.5vw,30px)', color: status.tone === 'late' ? 'var(--neg)' : undefined }}>
            {status.text}
          </div>
          {active ? (
            <>
              <div className="facts">
                <div className="fact">
                  <small>Next due</small>
                  <strong className="num">{c.nextDue ? shortDate(c.nextDue) : '—'}</strong>
                </div>
                <div className="fact">
                  <small>{c.credit + c.extraCredit > 0 ? 'Credit' : 'Amount'}</small>
                  <strong className="num">
                    <Money n={c.credit + c.extraCredit > 0 ? c.credit + c.extraCredit : c.behindAmount || c.nextDueAmount} />
                  </strong>
                </div>
              </div>
              <div className="actions" style={{ gridTemplateColumns: '1fr' }}>
                <AddButton className="btn" kind="expense" categoryId={tontineCat?.id} groupId={g.id} amount={c.behindAmount || c.nextDueAmount || per}>
                  <Icon name="plus" />
                  Log payment
                </AddButton>
              </div>
            </>
          ) : (
            <div className="facts" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <div className="fact">
                <small>Paid</small>
                <strong className="num">
                  <Money n={view.paidTotal} />
                </strong>
              </div>
              <div className="fact">
                <small>Collected</small>
                <strong className="num">
                  <Money n={view.collected} />
                </strong>
              </div>
              <div className="fact">
                <small>Credit left</small>
                <strong className="num">
                  <Money n={c.credit + c.extraCredit} />
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="section-h">
          <h2>Your turns</h2>
        </div>
        <div className="set-group">
          {view.turns.map((t, i) => {
            const due = t.status === 'upcoming' && t.turn_on <= today
            return (
              <div key={t.id} className="set-row">
                <span className="tile" style={tint(t.status === 'upcoming' ? (due ? 'violet' : 'slate') : 'teal')}>
                  <Icon name={t.status === 'upcoming' ? 'calendar' : 'check'} />
                </span>
                <div className="mid">
                  <b>
                    {shortDate(t.turn_on)} · {fmt(t.expected_amount)} FCFA
                  </b>
                  <small>
                    Name {i + 1} · {due ? (t.turn_on === today ? 'Today' : 'Ready to collect') : TURN_LABEL[t.status]}
                  </small>
                </div>
                {due && active && <CollectPayoutSheet turn={t} groupName={g.name} today={today} pots={pots} cats={cats} />}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="section-h">
          <h2>Payments</h2>
        </div>
        <div className="panel" style={{ padding: '6px 16px 8px' }}>
          {payments.length ? (
            <div className="list">
              {payments.map((t) => (
                <TxRow key={t.id} t={t} cats={cats} pots={pots} sub={dayLabel(t.occurred_on, today)} />
              ))}
            </div>
          ) : (
            <p className="hint" style={{ padding: '12px 0' }}>
              No payments logged yet. Tap “Log payment” when you send money to the treasurer.
            </p>
          )}
        </div>

        {active ? (
          <>
            <div className="section-h">
              <h2>Settings</h2>
            </div>
            <div className="set-group">
              <div className="set-row">
                <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                  <Icon name="bell" />
                </span>
                <div className="mid">
                  <b>Reminders</b>
                  <small>Only when a payment is due, on your turn, or if you fall behind</small>
                </div>
                <RemindersSwitch id={g.id} enabled={g.reminders_enabled} />
              </div>
            </div>
            <div className="danger-zone">
              <EndCycle id={g.id} />
            </div>
          </>
        ) : (
          <Link className="btn block" style={{ marginTop: 18 }} href={`/tontines/new?from=${g.id}`}>
            <Icon name="refresh-cw" />
            Start a new round
          </Link>
        )}
      </div>
    </div>
  )
}
