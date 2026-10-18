'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { saveTontineGroup } from '@/lib/tontine-actions'
import { addPeriods, estimateCycleEnd, nextRoundStart, type Frequency } from '@/lib/tontine'
import { fmt, parseIso, shortDate } from '@/lib/format'
import type { TontineView } from '@/lib/data'

const digits = (s: string) => s.replace(/\D/g, '').slice(0, 10)
type TurnDraft = { id?: string; turnOn: string; beforeApp: boolean; collected?: boolean }

export function TontineForm({ today, group, from }: { today: string; group?: TontineView; from?: TontineView }) {
  const router = useRouter()
  const toast = useToast()
  const { openDate, openTime } = usePickers()
  const [pending, start] = useTransition()
  const src = group?.group ?? from?.group
  const carry = from ? from.coverage.credit + from.coverage.extraCredit : 0

  const [name, setName] = useState(src?.name ?? '')
  const [amount, setAmount] = useState(src ? String(src.amount_per_name) : '')
  const [namesTotal, setNamesTotal] = useState(src ? String(src.names_total) : '')
  const [held, setHeld] = useState(src?.names_held ?? 1)
  const [frequency, setFrequency] = useState<Frequency>(src?.frequency ?? 'weekly')
  const [deadline, setDeadline] = useState(src?.deadline_time ?? '18:00')
  const [cycleStart, setCycleStart] = useState(group ? group.group.cycle_start : from ? nextRoundStart(from.group) : today)
  const [firstDue, setFirstDue] = useState(group ? group.group.first_due : from ? nextRoundStart(from.group) : today)
  const [cycleEnd, setCycleEnd] = useState(group?.group.cycle_end ?? '')
  const [endTouched, setEndTouched] = useState(Boolean(group))
  const [turns, setTurns] = useState<TurnDraft[]>(
    group ? group.turns.map((t) => ({ id: t.id, turnOn: t.turn_on, beforeApp: t.status === 'before_app', collected: t.status === 'collected' })) : [{ turnOn: today, beforeApp: false }],
  )
  const [carryCredit, setCarryCredit] = useState(carry > 0)
  const [err, setErr] = useState('')

  const per = Number(amount || 0)
  const total = Number(namesTotal || 0)
  const estimatedEnd = total >= 2 ? estimateCycleEnd(cycleStart, total, frequency) : cycleStart
  const end = endTouched && cycleEnd ? cycleEnd : estimatedEnd
  const unit = frequency === 'weekly' ? `every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseIso(firstDue).getDay()]}` : `on day ${parseIso(firstDue).getDate()} of each month`

  const setHeldCount = (n: number) => {
    const next = Math.max(1, Math.min(n, total || 200))
    setHeld(next)
    setTurns((cur) => (cur.length >= next ? cur.slice(0, Math.max(next, cur.filter((t) => t.collected).length)) : [...cur, ...Array.from({ length: next - cur.length }, () => ({ turnOn: addPeriods(cycleStart, frequency, cur.length), beforeApp: false }))]))
  }

  const submit = () =>
    start(async () => {
      setErr('')
      const res = await saveTontineGroup({
        id: group?.group.id,
        name,
        amountPerName: per,
        namesTotal: total,
        namesHeld: held,
        frequency,
        deadlineTime: deadline,
        cycleStart,
        cycleEnd: end,
        firstDue,
        turns: turns.map(({ id, turnOn, beforeApp }) => ({ id, turnOn, beforeApp })),
        openingCredit: from && carryCredit ? carry : 0,
      })
      if (!res.ok) return setErr(res.error)
      toast(group ? 'Changes saved' : `“${name.trim()}” added`)
      router.replace(`/tontines/${res.data.id}`)
    })

  const dateBtn = (value: string, title: string, onPick: (v: string) => void, opts: { min?: string; max?: string; disabled?: boolean } = {}) => (
    <button type="button" className="time" aria-haspopup="dialog" disabled={opts.disabled} onClick={(e) => openDate({ anchor: e.currentTarget, value, today, title, min: opts.min, max: opts.max, onPick })}>
      <Icon name="calendar" />
      {shortDate(value)}
    </button>
  )

  return (
    <>
      <div className="panel stack">
        <div className="fld">
          <label htmlFor="tg-name">Name</label>
          <div className="text-in">
            <input id="tg-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="e.g. Friday tontine" autoComplete="off" />
          </div>
        </div>
        <div className="fld">
          <label htmlFor="tg-amount">Amount per name</label>
          <div className="money">
            <input id="tg-amount" inputMode="numeric" value={amount ? fmt(per) : ''} onChange={(e) => setAmount(digits(e.target.value))} placeholder="2,500" />
            <span>FCFA</span>
          </div>
        </div>
        <div className="fld">
          <label htmlFor="tg-names">Number of names in the group</label>
          <div className="money">
            <input id="tg-names" inputMode="numeric" value={namesTotal} onChange={(e) => setNamesTotal(digits(e.target.value).slice(0, 3))} placeholder="20" />
            <span>names</span>
          </div>
        </div>
        <div className="sub-row" style={{ borderTop: 0, padding: 0 }}>
          <div className="mid">
            <b>Names I hold</b>
            <small>One turn per name</small>
          </div>
          <div className="stepper" role="group" aria-label="Names I hold">
            <button type="button" aria-label="One less" disabled={held <= 1} onClick={() => setHeldCount(held - 1)}>
              <Icon name="minus" />
            </button>
            <span className="num" aria-live="polite">{held}</span>
            <button type="button" aria-label="One more" disabled={!!total && held >= total} onClick={() => setHeldCount(held + 1)}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
        {per > 0 && total >= 2 && (
          <p className="notice" style={{ padding: '10px 14px' }}>
            You pay {fmt(per * held)} FCFA {unit} · Payout {fmt(per * total)} FCFA per turn
          </p>
        )}
        {group && <p className="hint">Changes to amounts or names apply from your next unpaid deadline.</p>}
      </div>

      <div className="section-h">
        <h2>Schedule</h2>
      </div>
      <div className="set-group">
        <div className="set-row" style={{ flexWrap: 'wrap' }}>
          <div className="mid">
            <b>Frequency</b>
          </div>
          <div className="mini-chips" style={{ flexBasis: 'auto' }} role="group" aria-label="Frequency">
            {(['weekly', 'monthly'] as const).map((f) => (
              <button key={f} type="button" className="chipsel" aria-pressed={frequency === f} onClick={() => setFrequency(f)}>
                {f === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div className="mid">
            <b>Deadline time</b>
            <small>Pay before this time on the due day</small>
          </div>
          <button type="button" className="time" aria-haspopup="dialog" onClick={(e) => openTime({ anchor: e.currentTarget, value: deadline, title: 'Deadline time', onPick: setDeadline })}>
            <Icon name="clock-3" />
            <span className="num">{deadline}</span>
          </button>
        </div>
        <div className="set-row">
          <div className="mid">
            <b>Cycle start</b>
            <small>When the group began</small>
          </div>
          {dateBtn(cycleStart, 'Cycle start', setCycleStart)}
        </div>
        <div className="set-row">
          <div className="mid">
            <b>My next due date</b>
            <small>{group ? 'Updated automatically as you pay' : 'The first payment you haven’t made yet'}</small>
          </div>
          {dateBtn(firstDue, 'My next due date', setFirstDue, { min: cycleStart, disabled: Boolean(group) })}
        </div>
        <div className="set-row">
          <div className="mid">
            <b>Cycle end</b>
            <small>{endTouched ? 'Set by you' : 'Estimated from the number of names'}</small>
          </div>
          {dateBtn(end, 'Cycle end', (v) => {
            setCycleEnd(v)
            setEndTouched(true)
          }, { min: cycleStart })}
        </div>
      </div>

      <div className="section-h">
        <h2>My turns</h2>
      </div>
      <div className="set-group">
        {turns.map((t, i) => (
          <div key={t.id ?? i} className="sub-row" style={{ padding: '12px 16px', borderTop: i ? undefined : 0 }}>
            <div className="mid">
              <b>Name {i + 1}</b>
              <small>{t.collected ? 'Collected' : t.beforeApp ? 'Already collected (before the app)' : 'Upcoming'}</small>
            </div>
            {dateBtn(t.turnOn, `Turn for name ${i + 1}`, (v) => setTurns((cur) => cur.map((x, j) => (j === i ? { ...x, turnOn: v } : x))), { min: cycleStart, disabled: t.collected })}
            {!t.collected && (
              <div className="mini-chips" role="group" aria-label={`Name ${i + 1} status`}>
                <button type="button" className="chipsel" aria-pressed={!t.beforeApp} onClick={() => setTurns((cur) => cur.map((x, j) => (j === i ? { ...x, beforeApp: false } : x)))}>
                  Upcoming
                </button>
                <button type="button" className="chipsel" aria-pressed={t.beforeApp} onClick={() => setTurns((cur) => cur.map((x, j) => (j === i ? { ...x, beforeApp: true } : x)))}>
                  Already collected
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {from && carry > 0 && (
        <div className="set-group" style={{ marginTop: 14 }}>
          <div className="set-row">
            <div className="mid">
              <b>Carry {fmt(carry)} FCFA credit</b>
              <small>Left over from the last cycle</small>
            </div>
            <button type="button" className="switch" role="switch" aria-checked={carryCredit} aria-label="Carry credit" onClick={() => setCarryCredit(!carryCredit)} />
          </div>
        </div>
      )}

      {err && (
        <p className="form-err" role="alert" style={{ marginTop: 14 }}>
          {err}
        </p>
      )}
      <button className="btn block" style={{ marginTop: 18 }} disabled={pending || !name.trim() || !per || total < 2} onClick={submit}>
        <Icon name={pending ? 'loader' : 'check'} />
        {group ? 'Save changes' : 'Create group'}
      </button>
    </>
  )
}
