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
import { getLang, getT } from '@/lib/i18n/server'

type P = Promise<{ id: string }>

export default async function TontinePage({ params }: { params: P }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.common.tontine}>
      <Link className="back" href="/tontines">
        <Icon name="chevron-left" />
        {t.tontines.title}
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

async function Group({ params }: { params: P }) {
  const { id } = await params
  const [view, today, cats, pots, txs, lang, m] = await Promise.all([getTontineGroup(id), getToday(), getCategories(), getPots(), getTransactions(), getLang(), getT()])
  const tt = m.tontine
  const day = (iso: string) => shortDate(iso, lang)
  if (!view) notFound()
  const { group: g, coverage: c, status } = view
  const active = g.status === 'active'
  const tontineCat = cats.find((x) => x.role === 'tontine')
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
              {active ? (
                <>
                  {fmt(per)} <span className="cur" /> {tt.perPeriod(g.frequency === 'weekly')}
                </>
              ) : (
                tt.pastCycle
              )}
            </span>
            {active && (
              <Link className="btn-sm" style={{ background: 'var(--surface-2)' }} href={`/tontines/${g.id}/edit`}>
                <Icon name="pencil" size={14} />
                {m.common.edit}
              </Link>
            )}
          </div>
          <h2>{g.name}</h2>
          <small className="muted">
            {tt.namesOf(g.names_held, g.names_total)} · {day(g.cycle_start)} – {day(g.cycle_end)}
          </small>
          <div className="big" style={{ fontSize: 'clamp(24px,6.5vw,30px)', color: status.tone === 'late' ? 'var(--neg)' : undefined }}>
            {status.text}
          </div>
          {active ? (
            <>
              <div className="facts">
                <div className="fact">
                  <small>{tt.nextDue}</small>
                  <strong className="num">{c.nextDue ? day(c.nextDue) : '—'}</strong>
                </div>
                <div className="fact">
                  <small>{c.credit + c.extraCredit > 0 ? tt.credit : tt.amount}</small>
                  <strong className="num">
                    <Money n={c.credit + c.extraCredit > 0 ? c.credit + c.extraCredit : c.behindAmount || c.nextDueAmount} />
                  </strong>
                </div>
              </div>
              <div className="actions" style={{ gridTemplateColumns: '1fr' }}>
                <AddButton className="btn" kind="expense" categoryId={tontineCat?.id} groupId={g.id} amount={c.behindAmount || c.nextDueAmount || per}>
                  <Icon name="plus" />
                  {tt.logPayment}
                </AddButton>
              </div>
            </>
          ) : (
            <div className="facts" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <div className="fact">
                <small>{tt.paid}</small>
                <strong className="num">
                  <Money n={view.paidTotal} />
                </strong>
              </div>
              <div className="fact">
                <small>{tt.collected}</small>
                <strong className="num">
                  <Money n={view.collected} />
                </strong>
              </div>
              <div className="fact">
                <small>{tt.creditLeft}</small>
                <strong className="num">
                  <Money n={c.credit + c.extraCredit} />
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="section-h">
          <h2>{tt.yourTurns}</h2>
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
                    {day(t.turn_on)} · {fmt(t.expected_amount)} <span className="cur" />
                  </b>
                  <small>
                    {tt.nameN(i + 1)} · {due ? (t.turn_on === today ? m.date.today : tt.readyToCollect) : tt.turnStatus[t.status]}
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
          <h2>{tt.payments}</h2>
        </div>
        <div className="panel" style={{ padding: '6px 16px 8px' }}>
          {payments.length ? (
            <div className="list">
              {payments.map((t) => (
                <TxRow key={t.id} t={t} cats={cats} pots={pots} sub={dayLabel(t.occurred_on, today, lang)} lang={lang} />
              ))}
            </div>
          ) : (
            <p className="hint" style={{ padding: '12px 0' }}>
              {tt.noPayments}
            </p>
          )}
        </div>

        {active ? (
          <>
            <div className="section-h">
              <h2>{tt.settings}</h2>
            </div>
            <div className="set-group">
              <div className="set-row">
                <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                  <Icon name="bell" />
                </span>
                <div className="mid">
                  <b>{tt.reminders}</b>
                  <small>{tt.remindersHint}</small>
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
            {tt.newRound}
          </Link>
        )}
      </div>
    </div>
  )
}
