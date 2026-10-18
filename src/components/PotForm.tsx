'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { deletePot, savePot } from '@/lib/actions'
import { fmt, shortDate, tint } from '@/lib/format'
import type { Category, Pot, Repeat } from '@/lib/types'

const digits = (s: string) => s.replace(/\D/g, '').slice(0, 10)

export function PotForm({ cats, pot, categoryId, today, hasMoves }: { cats: Category[]; pot?: Pot; categoryId?: string; today: string; hasMoves?: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const { openDate } = usePickers()
  const [pending, start] = useTransition()
  const [cat, setCat] = useState(pot?.category_id ?? categoryId ?? cats[0]?.id ?? '')
  const [name, setName] = useState(pot?.name ?? '')
  const [note, setNote] = useState(pot?.note ?? '')
  const [initial, setInitial] = useState(pot ? String(pot.initial_amount) : '')
  const [startedOn, setStartedOn] = useState(pot?.started_on ?? today)
  const [goal, setGoal] = useState(pot?.goal_amount ? String(pot.goal_amount) : '')
  const [schedule, setSchedule] = useState(Boolean(pot?.due_date))
  const [due, setDue] = useState(pot?.due_date ?? today)
  const [repeat, setRepeat] = useState<Repeat>(pot?.repeat ?? 'monthly')
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
        dueDate: schedule ? due : null,
        repeat,
      })
      if (!res.ok) return setErr(res.error)
      toast(pot ? 'Changes saved' : `Pot “${name.trim()}” created`)
      router.replace(`/savings/${res.data.id}`)
    })

  const remove = () =>
    start(async () => {
      const res = await deletePot(pot!.id)
      if (!res.ok) return setErr(res.error)
      toast(`“${pot!.name}” deleted`)
      router.replace('/savings')
    })

  return (
    <>
      <div className="panel stack">
        <div className="fld">
          <label>Category</label>
          <div className="chips" style={{ padding: 0 }} role="group" aria-label="Savings category">
            {cats.map((c) => (
              <button key={c.id} type="button" className="chipsel" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name={c.icon} size={15} style={{ color: tint(c.color).color }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="fld">
          <label htmlFor="pot-name">Name</label>
          <div className="text-in">
            <input id="pot-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="e.g. Girlfriends tontine" autoComplete="off" />
          </div>
        </div>
        <div className="fld">
          <label htmlFor="pot-note">
            Note <span className="muted" style={{ fontWeight: 450 }}>(optional)</span>
          </label>
          <div className="text-in">
            <input id="pot-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder="e.g. 25,000 / month · round 7 of 12" autoComplete="off" />
          </div>
        </div>
      </div>

      <div className="section-h">
        <h2>Starting balance</h2>
      </div>
      <div className="panel stack">
        <div className="fld">
          <label htmlFor="pot-init">What&apos;s already in it</label>
          <div className="money">
            <input id="pot-init" inputMode="numeric" value={initial ? fmt(Number(initial)) : ''} onChange={(e) => setInitial(digits(e.target.value))} placeholder="0" />
            <span>FCFA</span>
          </div>
        </div>
        <div className="fld">
          <label>As of</label>
          <div>
            <button type="button" className="time" aria-haspopup="dialog" onClick={(e) => openDate({ anchor: e.currentTarget, value: startedOn, today, max: today, title: 'Starting balance date', onPick: setStartedOn })}>
              <Icon name="calendar" />
              {shortDate(startedOn)}
            </button>
          </div>
        </div>
        <div className="fld">
          <label htmlFor="pot-goal">
            Goal <span className="muted" style={{ fontWeight: 450 }}>(optional)</span>
          </label>
          <div className="money">
            <input id="pot-goal" inputMode="numeric" value={goal ? fmt(Number(goal)) : ''} onChange={(e) => setGoal(digits(e.target.value))} placeholder="No goal" />
            <span>FCFA</span>
          </div>
        </div>
      </div>

      <div className="section-h">
        <h2>Contribution schedule</h2>
      </div>
      <div className="set-group">
        <div className="set-row">
          <span className="tile" style={tint('amber')}>
            <Icon name="calendar-clock" />
          </span>
          <div className="mid">
            <b>Remind me when it&apos;s due</b>
            <small>For tontines and regular contributions</small>
          </div>
          <button type="button" className="switch" role="switch" aria-checked={schedule} aria-label="Remind me when it's due" onClick={() => setSchedule(!schedule)} />
        </div>
        {schedule && (
          <div className="sub-opts">
            <div className="sub-row">
              <div className="mid">
                <b>Next due date</b>
              </div>
              <button type="button" className="time" aria-haspopup="dialog" onClick={(e) => openDate({ anchor: e.currentTarget, value: due, today, min: today, title: 'Next due date', onPick: setDue })}>
                <Icon name="calendar" />
                {shortDate(due)}
              </button>
              <div className="mini-chips" role="group" aria-label="Repeats">
                {(['weekly', 'monthly', 'once'] as const).map((r) => (
                  <button key={r} type="button" className="chipsel" aria-pressed={repeat === r} onClick={() => setRepeat(r)}>
                    {r[0].toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {err && (
        <p className="form-err" role="alert" style={{ marginTop: 14 }}>
          {err}
        </p>
      )}
      <button className="btn block" style={{ marginTop: 18 }} disabled={!name.trim() || !cat || pending} onClick={submit}>
        <Icon name={pending ? 'loader' : 'check'} />
        {pot ? 'Save changes' : 'Create pot'}
      </button>

      {pot && (
        <div className="danger-zone">
          <button className="btn-danger" disabled={hasMoves || pending} onClick={remove}>
            <Icon name="trash-2" />
            Delete pot
          </button>
          <span className="hint">{hasMoves ? 'This pot has deposits or withdrawals. Delete those first.' : 'This removes the pot and its starting balance.'}</span>
        </div>
      )}
    </>
  )
}
