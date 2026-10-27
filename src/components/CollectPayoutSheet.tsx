'use client'

import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { useCurrency } from './currency'
import { useLang, useT } from './i18n'
import { sanitizeMoney, typedLabel } from './Keypad'
import { collectTontinePayout } from '@/lib/tontine-actions'
import { dayLabel, fmt, tint } from '@/lib/format'
import type { Category, Pot, TontineTurn } from '@/lib/types'


export function CollectPayoutSheet({ turn, groupName, today, pots, cats }: { turn: TontineTurn; groupName: string; today: string; pots: Pot[]; cats: Category[] }) {
  const toast = useToast()
  const cur = useCurrency()
  const { openDate } = usePickers()
  const lang = useLang()
  const m = useT()
  const p = m.payout
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
      toast(p.recorded(`${fmt(amt)} ${cur.symbol}`))
    })

  return (
    <>
      <button className="btn-sm" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }} onClick={() => setOpen(true)}>
        {p.collect}
      </button>
      <div className={`scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} />
      <div className={`sheet${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-labelledby="payout-title" aria-hidden={!open}>
        <div className="grab" />
        <div className="sheet-h">
          <h2 id="payout-title">{p.title}</h2>
          <button className="icon-btn" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} aria-label={m.common.close} onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </div>
        <p className="hint" style={{ marginBottom: 12 }}>
          {p.countsAsIncome(groupName)}
        </p>
        <div className="stack" style={{ overflowY: 'auto' }}>
          <div className="fld">
            <label htmlFor="po-amount">{p.received}</label>
            <div className="money">
              <input id="po-amount" inputMode={cur.decimals ? 'decimal' : 'numeric'} value={amount ? fmt(amt) : ''} onChange={(e) => setAmount(sanitizeMoney(e.target.value, cur.decimals))} />
              <span className="cur-label" />
            </div>
          </div>
          <div className="sub-row" style={{ borderTop: 0, padding: 0 }}>
            <div className="mid">
              <b>{m.common.date}</b>
            </div>
            <button type="button" className="time" aria-haspopup="dialog" onClick={(e) => openDate({ anchor: e.currentTarget, value: date, today, max: today, title: p.dateTitle, quick: true, onPick: setDate })}>
              <Icon name="calendar" />
              {dayLabel(date, today, lang)}
            </button>
          </div>
          <div className="set-group" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
            <div className="set-row">
              <div className="mid">
                <b>{p.moveToSavings}</b>
                <small>{pots.length ? p.moveHint : p.createPotFirst}</small>
              </div>
              <button type="button" className="switch" role="switch" aria-checked={save} aria-label={p.moveToSavings} disabled={!pots.length} onClick={() => setSave(!save)} />
            </div>
            {save && (
              <div style={{ padding: '0 16px 14px' }} className="stack">
                <div className="catpick" role="group" aria-label={p.pot} style={{ margin: '0 -16px', paddingTop: 0 }}>
                  {pots.map((pot) => {
                    const c = cats.find((c) => c.id === pot.category_id)
                    const t = tint(c?.color ?? 'violet')
                    return (
                      <button key={pot.id} type="button" className="cp" aria-pressed={potId === pot.id} onClick={() => setPotId(pot.id)} style={{ color: t.color }}>
                        <span className="tile" style={t}>
                          <Icon name={c?.icon ?? 'piggy-bank'} />
                        </span>
                        <span style={{ color: potId === pot.id ? 'var(--ink)' : 'var(--ink-2)' }}>{pot.name}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="money">
                  <input aria-label={p.amountToSave} inputMode={cur.decimals ? 'decimal' : 'numeric'} value={saveAmount ? typedLabel(saveAmount) : ''} onChange={(e) => setSaveAmount(sanitizeMoney(e.target.value, cur.decimals))} />
                  <span className="cur-label" />
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
          {p.collectAmount(`${fmt(amt)} ${cur.symbol}`)}
        </button>
      </div>
    </>
  )
}
