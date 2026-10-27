'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { useCurrency } from './currency'
import { useLang, useT } from './i18n'
import { sanitizeMoney, typedLabel } from './Keypad'
import { deletePot, savePot } from '@/lib/actions'
import { shortDate, tint } from '@/lib/format'
import type { Category, Pot } from '@/lib/types'


export function PotForm({ cats, pot, categoryId, today, hasMoves }: { cats: Category[]; pot?: Pot; categoryId?: string; today: string; hasMoves?: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const cur = useCurrency()
  const { openDate } = usePickers()
  const lang = useLang()
  const m = useT()
  const t = m.potForm
  const [pending, start] = useTransition()
  const [cat, setCat] = useState(pot?.category_id ?? categoryId ?? cats[0]?.id ?? '')
  const [name, setName] = useState(pot?.name ?? '')
  const [note, setNote] = useState(pot?.note ?? '')
  const [initial, setInitial] = useState(pot ? String(pot.initial_amount) : '')
  const [startedOn, setStartedOn] = useState(pot?.started_on ?? today)
  const [goal, setGoal] = useState(pot?.goal_amount ? String(pot.goal_amount) : '')
  const [err, setErr] = useState('')

  const submit = () =>
    start(async () => {
      setErr('')
      const res = await savePot({
        id: pot?.id,
        categoryId: cat,
        name,
        note,
        initialAmount: Number(initial || 0),
        startedOn,
        goalAmount: goal ? Number(goal) : null,
      })
      if (!res.ok) return setErr(res.error)
      toast(pot ? m.common.changesSaved : t.created(name.trim()))
      router.replace(`/savings/${res.data.id}`)
    })

  const remove = () =>
    start(async () => {
      const res = await deletePot(pot!.id)
      if (!res.ok) return setErr(res.error)
      toast(m.common.deleted(pot!.name))
      router.replace('/savings')
    })

  return (
    <>
      <div className="panel stack">
        <div className="fld">
          <label>{m.common.category}</label>
          <div className="chips" style={{ padding: 0 }} role="group" aria-label={t.savingsCategory}>
            {cats.map((c) => (
              <button key={c.id} type="button" className="chipsel" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name={c.icon} size={15} style={{ color: tint(c.color).color }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="fld">
          <label htmlFor="pot-name">{m.common.name}</label>
          <div className="text-in">
            <input id="pot-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder={t.namePlaceholder} autoComplete="off" />
          </div>
        </div>
        <div className="fld">
          <label htmlFor="pot-note">
            {m.common.note} <span className="muted" style={{ fontWeight: 450 }}>{m.common.optional}</span>
          </label>
          <div className="text-in">
            <input id="pot-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder={t.notePlaceholder} autoComplete="off" />
          </div>
        </div>
      </div>

      <div className="section-h">
        <h2>{m.pot.startingBalance}</h2>
      </div>
      <div className="panel stack">
        <div className="fld">
          <label htmlFor="pot-init">{t.alreadyIn}</label>
          <div className="money">
            <input id="pot-init" inputMode={cur.decimals ? 'decimal' : 'numeric'} value={initial ? typedLabel(initial) : ''} onChange={(e) => setInitial(sanitizeMoney(e.target.value, cur.decimals))} placeholder="0" />
            <span className="cur-label" />
          </div>
        </div>
        <div className="fld">
          <label>{t.asOf}</label>
          <div>
            <button type="button" className="time" aria-haspopup="dialog" onClick={(e) => openDate({ anchor: e.currentTarget, value: startedOn, today, max: today, title: t.dateTitle, onPick: setStartedOn })}>
              <Icon name="calendar" />
              {shortDate(startedOn, lang)}
            </button>
          </div>
        </div>
        <div className="fld">
          <label htmlFor="pot-goal">
            {m.pot.goal} <span className="muted" style={{ fontWeight: 450 }}>{m.common.optional}</span>
          </label>
          <div className="money">
            <input id="pot-goal" inputMode={cur.decimals ? 'decimal' : 'numeric'} value={goal ? typedLabel(goal) : ''} onChange={(e) => setGoal(sanitizeMoney(e.target.value, cur.decimals))} placeholder={t.noGoal} />
            <span className="cur-label" />
          </div>
        </div>
      </div>

      {err && (
        <p className="form-err" role="alert" style={{ marginTop: 14 }}>
          {err}
        </p>
      )}
      <button className="btn block" style={{ marginTop: 18 }} disabled={!name.trim() || !cat || pending} onClick={submit}>
        <Icon name={pending ? 'loader' : 'check'} />
        {pot ? m.common.saveChanges : t.create}
      </button>

      {pot && (
        <div className="danger-zone">
          <button className="btn-danger" disabled={hasMoves || pending} onClick={remove}>
            <Icon name="trash-2" />
            {t.delete}
          </button>
          <span className="hint">{hasMoves ? t.hasMoves : t.deleteHint}</span>
        </div>
      )}
    </>
  )
}
