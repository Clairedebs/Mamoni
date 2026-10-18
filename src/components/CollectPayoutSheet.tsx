'use client'

import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { collectTontinePayout } from '@/lib/tontine-actions'
import { dayLabel, fmt, tint } from '@/lib/format'
import type { Category, Pot, TontineTurn } from '@/lib/types'

const digits = (s: string) => s.replace(/\D/g, '').slice(0, 10)

export function CollectPayoutSheet({ turn, groupName, today, pots, cats }: { turn: TontineTurn; groupName: string; today: string; pots: Pot[]; cats: Category[] }) {
  const toast = useToast()
  const { openDate } = usePickers()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(turn.expected_amount))
  const [date, setDate] = useState(turn.turn_on > today ? today : turn.turn_on)
  const [save, setSave] = useState(pots.length > 0)
  const [potId, setPotId] = useState(pots[0]?.id ?? '')
  const [saveAmount, setSaveAmount] = useState(String(turn.expected_amount))
  const [err, setErr] = useState('')
  const amt = Number(amount || 0)

  const submit = () =>
    start(async () => {
      setErr('')
      const res = await collectTontinePayout({ turnId: turn.id, amount: amt, occurredOn: date, savePotId: save ? potId : undefined, saveAmount: save ? Number(saveAmount || 0) : 0 })
      if (!res.ok) return setErr(res.error)
      setOpen(false)
      toast(`Payout of ${fmt(amt)} FCFA recorded`)
    })

  return (
    <>
      <button className="btn-sm" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }} onClick={() => setOpen(true)}>
        Collect
      </button>
      <div className={`scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} />
      <div className={`sheet${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-labelledby="payout-title" aria-hidden={!open}>
        <div className="grab" />
        <div className="sheet-h">
          <h2 id="payout-title">Collect payout</h2>
          <button className="icon-btn" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} aria-label="Close" onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </div>
        <p className="hint" style={{ marginBottom: 12 }}>
          {groupName} · counts as income
        </p>
        <div className="stack" style={{ overflowY: 'auto' }}>
          <div className="fld">
            <label htmlFor="po-amount">Amount received</label>
            <div className="money">
              <input id="po-amount" inputMode="numeric" value={amount ? fmt(amt) : ''} onChange={(e) => setAmount(digits(e.target.value))} />
              <span>FCFA</span>
            </div>
          </div>
          <div className="sub-row" style={{ borderTop: 0, padding: 0 }}>
            <div className="mid">
              <b>Date</b>
            </div>
            <button type="button" className="time" aria-haspopup="dialog" onClick={(e) => openDate({ anchor: e.currentTarget, value: date, today, max: today, title: 'Payout date', quick: true, onPick: setDate })}>
              <Icon name="calendar" />
              {dayLabel(date, today)}
            </button>
          </div>
          <div className="set-group" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
            <div className="set-row">
              <div className="mid">
                <b>Move to savings</b>
                <small>{pots.length ? 'Put some or all of it in a pot' : 'Create a savings pot first'}</small>
              </div>
              <button type="button" className="switch" role="switch" aria-checked={save} aria-label="Move to savings" disabled={!pots.length} onClick={() => setSave(!save)} />
            </div>
            {save && (
              <div style={{ padding: '0 16px 14px' }} className="stack">
                <div className="catpick" role="group" aria-label="Savings pot" style={{ margin: '0 -16px', paddingTop: 0 }}>
                  {pots.map((p) => {
                    const c = cats.find((c) => c.id === p.category_id)
                    const t = tint(c?.color ?? 'violet')
                    return (
                      <button key={p.id} type="button" className="cp" aria-pressed={potId === p.id} onClick={() => setPotId(p.id)} style={{ color: t.color }}>
                        <span className="tile" style={t}>
                          <Icon name={c?.icon ?? 'piggy-bank'} />
                        </span>
                        <span style={{ color: potId === p.id ? 'var(--ink)' : 'var(--ink-2)' }}>{p.name}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="money">
                  <input aria-label="Amount to save" inputMode="numeric" value={saveAmount ? fmt(Number(saveAmount)) : ''} onChange={(e) => setSaveAmount(digits(e.target.value))} />
                  <span>FCFA</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {err && (
          <p className="form-err" role="alert" style={{ marginTop: 10 }}>
            {err}
          </p>
        )}
        <button className="btn block" style={{ marginTop: 14 }} disabled={!amt || pending} onClick={submit}>
          <Icon name={pending ? 'loader' : 'check'} />
          Collect {fmt(amt)} FCFA
        </button>
      </div>
    </>
  )
}
