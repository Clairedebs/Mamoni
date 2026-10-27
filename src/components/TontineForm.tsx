'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { useCurrency } from './currency'
import { useLang, useT } from './i18n'
import { sanitizeMoney, typedLabel } from './Keypad'
import { saveTontineGroup } from '@/lib/tontine-actions'
import { addPeriods, estimateCycleEnd, nextRoundStart, type Frequency } from '@/lib/tontine'
import { fmt, parseIso, shortDate, weekdayLong } from '@/lib/format'
import type { TontineView } from '@/lib/data'

const digits = (s: string) => s.replace(/\D/g, '').slice(0, 10)
type TurnDraft = { id?: string; turnOn: string; beforeApp: boolean; collected?: boolean }

export function TontineForm({ today, group, from }: { today: string; group?: TontineView; from?: TontineView }) {
  const router = useRouter()
  const toast = useToast()
  const cur = useCurrency()
  const { openDate, openTime } = usePickers()
  const lang = useLang()
  const m = useT()
  const f = m.tontineForm
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
  const unit = frequency === 'weekly' ? f.everyWeekday(weekdayLong(firstDue, lang)) : f.monthlyOn(parseIso(firstDue).getDate())

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
      toast(group ? m.common.changesSaved : f.added(name.trim()))
      router.replace(`/tontines/${res.data.id}`)
    })

  const dateBtn = (value: string, title: string, onPick: (v: string) => void, opts: { min?: string; max?: string; disabled?: boolean } = {}) => (
    <button type="button" className="time" aria-haspopup="dialog" disabled={opts.disabled} onClick={(e) => openDate({ anchor: e.currentTarget, value, today, title, min: opts.min, max: opts.max, onPick })}>
      <Icon name="calendar" />
      {shortDate(value, lang)}
    </button>
  )

  return (
    <>
      <div className="panel stack">
        <div className="fld">
          <label htmlFor="tg-name">{m.common.name}</label>
          <div className="text-in">
            <input id="tg-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder={f.namePlaceholder} autoComplete="off" />
          </div>
        </div>
        <div className="fld">
          <label htmlFor="tg-amount">{f.amountPerName}</label>
          <div className="money">
            <input id="tg-amount" inputMode={cur.decimals ? 'decimal' : 'numeric'} value={amount ? typedLabel(amount) : ''} onChange={(e) => setAmount(sanitizeMoney(e.target.value, cur.decimals))} placeholder="2,500" />
            <span className="cur-label" />
          </div>
        </div>
        <div className="fld">
          <label htmlFor="tg-names">{f.namesTotal}</label>
          <div className="money">
            <input id="tg-names" inputMode="numeric" value={namesTotal} onChange={(e) => setNamesTotal(digits(e.target.value).slice(0, 3))} placeholder="20" />
            <span>{f.names}</span>
          </div>
        </div>
        <div className="sub-row" style={{ borderTop: 0, padding: 0 }}>
          <div className="mid">
            <b>{f.held}</b>
            <small>{f.heldHint}</small>
          </div>
          <div className="stepper" role="group" aria-label={f.held}>
            <button type="button" aria-label={f.less} disabled={held <= 1} onClick={() => setHeldCount(held - 1)}>
              <Icon name="minus" />
            </button>
            <span className="num" aria-live="polite">{held}</span>
            <button type="button" aria-label={f.more} disabled={!!total && held >= total} onClick={() => setHeldCount(held + 1)}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
        {per > 0 && total >= 2 && (
          <p className="notice" style={{ padding: '10px 14px' }}>
            {f.youPay(`${fmt(per * held)} ${cur.symbol}`, unit, `${fmt(per * total)} ${cur.symbol}`)}
          </p>
        )}
        {group && <p className="hint">{f.changesApply}</p>}
      </div>

      <div className="section-h">
        <h2>{f.schedule}</h2>
      </div>
      <div className="set-group">
        <div className="set-row" style={{ flexWrap: 'wrap' }}>
          <div className="mid">
            <b>{f.frequency}</b>
          </div>
          <div className="mini-chips" style={{ flexBasis: 'auto' }} role="group" aria-label={f.frequency}>
            {(['weekly', 'monthly'] as const).map((k) => (
              <button key={k} type="button" className="chipsel" aria-pressed={frequency === k} onClick={() => setFrequency(k)}>
                {k === 'weekly' ? f.weekly : f.monthly}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div className="mid">
            <b>{f.deadline}</b>
            <small>{f.deadlineHint}</small>
          </div>
          <button type="button" className="time" aria-haspopup="dialog" onClick={(e) => openTime({ anchor: e.currentTarget, value: deadline, title: f.deadline, onPick: setDeadline })}>
            <Icon name="clock-3" />
            <span className="num">{deadline}</span>
          </button>
        </div>
        <div className="set-row">
          <div className="mid">
            <b>{f.cycleStart}</b>
            <small>{f.cycleStartHint}</small>
          </div>
          {dateBtn(cycleStart, f.cycleStart, setCycleStart)}
        </div>
        <div className="set-row">
          <div className="mid">
            <b>{f.nextDue}</b>
            <small>{group ? f.nextDueAuto : f.nextDueNew}</small>
          </div>
          {dateBtn(firstDue, f.nextDue, setFirstDue, { min: cycleStart, disabled: Boolean(group) })}
        </div>
        <div className="set-row">
          <div className="mid">
            <b>{f.cycleEnd}</b>
            <small>{endTouched ? f.setByYou : f.estimated}</small>
          </div>
          {dateBtn(end, f.cycleEnd, (v) => {
            setCycleEnd(v)
            setEndTouched(true)
          }, { min: cycleStart })}
        </div>
      </div>

      <div className="section-h">
        <h2>{f.myTurns}</h2>
      </div>
      <div className="set-group">
        {turns.map((t, i) => (
          <div key={t.id ?? i} className="sub-row" style={{ padding: '12px 16px', borderTop: i ? undefined : 0 }}>
            <div className="mid">
              <b>{m.tontine.nameN(i + 1)}</b>
              <small>{t.collected ? m.tontine.turnStatus.collected : t.beforeApp ? f.beforeApp : m.tontine.turnStatus.upcoming}</small>
            </div>
            {dateBtn(t.turnOn, f.turnFor(i + 1), (v) => setTurns((cur) => cur.map((x, j) => (j === i ? { ...x, turnOn: v } : x))), { min: cycleStart, disabled: t.collected })}
            {!t.collected && (
              <div className="mini-chips" role="group" aria-label={f.statusOf(i + 1)}>
                <button type="button" className="chipsel" aria-pressed={!t.beforeApp} onClick={() => setTurns((cur) => cur.map((x, j) => (j === i ? { ...x, beforeApp: false } : x)))}>
                  {m.tontine.turnStatus.upcoming}
                </button>
                <button type="button" className="chipsel" aria-pressed={t.beforeApp} onClick={() => setTurns((cur) => cur.map((x, j) => (j === i ? { ...x, beforeApp: true } : x)))}>
                  {f.alreadyCollected}
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
              <b>{f.carry(`${fmt(carry)} ${cur.symbol}`)}</b>
              <small>{f.carryHint}</small>
            </div>
            <button type="button" className="switch" role="switch" aria-checked={carryCredit} aria-label={f.carryAria} onClick={() => setCarryCredit(!carryCredit)} />
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
        {group ? m.common.saveChanges : f.create}
      </button>
    </>
  )
}
