import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AddButton } from '@/components/AppShell'
import { Icon } from '@/components/Icon'
import { Money, Skeleton, TxRow } from '@/components/ui'
import { getCategories, getPots, getToday, getTransactions } from '@/lib/data'
import { dayLabel, fmt, sinceLabel, tint } from '@/lib/format'
import { getLang, getT } from '@/lib/i18n/server'

export default async function PotPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.pot.label}>
      <Link className="back" href="/savings">
        <Icon name="chevron-left" />
        {t.savings.title}
      </Link>
      <Suspense
        fallback={
          <div className="pd-grid" style={{ marginTop: 8 }}>
            <Skeleton h={330} style={{ borderRadius: 26 }} />
            <Skeleton h={220} style={{ borderRadius: 22 }} />
          </div>
        }
      >
        <Pot params={params} />
      </Suspense>
    </section>
  )
}

async function Pot({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [pots, cats, today, lang, t] = await Promise.all([getPots(), getCategories(), getToday(), getLang(), getT()])
  const p = pots.find((x) => x.id === id)
  if (!p) notFound()
  const g = cats.find((c) => c.id === p.category_id)!
  const moves = await getTransactions({ potId: id })
  const balance = Number(p.balance)
  const added = balance - Number(p.initial_amount)

  return (
    <div className="pd-grid" style={{ marginTop: 8 }}>
      <div className="pd-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="chip" style={tint(g.color)}>
            <Icon name={g.icon} />
            {g.name}
          </span>
          <Link className="btn-sm" style={{ background: 'var(--surface-2)' }} href={`/savings/pots/${p.id}/edit`}>
            <Icon name="pencil" size={14} />
            {t.common.edit}
          </Link>
        </div>
        <h2>{p.name}</h2>
        {p.note && <small className="muted">{p.note}</small>}
        <div className="big num">
          <Money n={balance} />
        </div>
        <div className="facts">
          <div className="fact">
            <small>{t.pot.startingSince(sinceLabel(p.started_on, lang))}</small>
            <strong className="num">
              <Money n={Number(p.initial_amount)} />
            </strong>
            <Link className="edit" href="/savings/setup">
              <Icon name="pencil" />
              {t.common.edit}
            </Link>
          </div>
          <div className="fact">
            <small>{t.pot.addedSince}</small>
            <strong className="num" style={{ color: added < 0 ? 'var(--neg)' : 'var(--pos)' }}>
              <Money n={Math.abs(added)} sign={added < 0 ? '−' : '+'} />
            </strong>
          </div>
        </div>
        {p.goal_amount ? (
          <div className="progress">
            <div className="lbls">
              <span>{t.pot.goal}</span>
              <span className="num">
                {Math.round((balance / Number(p.goal_amount)) * 100)}% · {fmt(Number(p.goal_amount))} <span className="cur" />
              </span>
            </div>
            <div className="tr">
              <i style={{ width: `${Math.min(100, (balance / Number(p.goal_amount)) * 100)}%`, background: `var(--pal-${g.color})` }} />
            </div>
          </div>
        ) : null}
        <div className="actions">
          <AddButton className="btn" kind="deposit" potId={p.id}>
            <Icon name="plus" />
            {t.pot.deposit}
          </AddButton>
          <AddButton className="btn ghost" kind="withdrawal" potId={p.id}>
            <Icon name="minus" />
            {t.pot.withdraw}
          </AddButton>
        </div>
      </div>
      <div>
        <div className="section-h">
          <h2>{t.pot.history}</h2>
        </div>
        <div className="panel" style={{ padding: '6px 16px 8px' }}>
          <div className="list">
            {moves.map((tx) => (
              <TxRow key={tx.id} t={tx} cats={cats} pots={pots} sub={dayLabel(tx.occurred_on, today, lang)} lang={lang} />
            ))}
            <div className="row">
              <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}>
                <Icon name="flag" />
              </span>
              <span className="mid">
                <b>{t.pot.startingBalance}</b>
                <small>{sinceLabel(p.started_on, lang)}</small>
              </span>
              <span className="amt num">
                <Money n={Number(p.initial_amount)} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
