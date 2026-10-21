'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Icon } from './Icon'
import { Keypad, pressKey } from './Keypad'
import { useAddSheet } from './AppShell'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { deleteTransaction, restoreTransaction, updateTransaction } from '@/lib/actions'
import { dayLabel, fmt, tint } from '@/lib/format'
import type { Category, PaletteKey, Pot, Transaction } from '@/lib/types'

const KIND: Record<Transaction['kind'], string> = { expense: 'Expense', income: 'Income', deposit: 'Deposit', withdrawal: 'Withdrawal' }

export function TxDetailSheet({ categories, pots, today, groupNames, payoutGroups }: {
  categories: Category[]
  pots: Pot[]
  today: string
  /** group id → group name */
  groupNames: Record<string, string>
  /** payout transaction id → group name */
  payoutGroups: Record<string, string>
}) {
  const { detail: tx, closeDetail } = useAddSheet()
  const { openDate } = usePickers()
  const toast = useToast()
  const [pending, start] = useTransition()
  const [shown, setShown] = useState<Transaction | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [amt, setAmt] = useState('')
  const [pick, setPick] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const closeBtn = useRef<HTMLButtonElement>(null)

  // A newly opened transaction resets the sheet (adjusted during render).
  if (tx && tx !== shown) {
    setShown(tx)
    setEditing(false)
    setConfirmDelete(false)
    setErr('')
    setAmt(String(tx.amount))
    setPick(tx.pot_id ?? tx.category_id ?? '')
    setDate(tx.occurred_on)
    setNote(tx.note ?? '')
  }
  const open = Boolean(tx)
  const t = tx ?? shown

  useEffect(() => {
    if (!open) return
    const f = setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.picker.on')) closeDetail()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(f)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, closeDetail])

  if (!t) return null

  const isSaving = t.kind === 'deposit' || t.kind === 'withdrawal'
  const payoutOf = payoutGroups[t.id]
  const lockedCategory = Boolean(t.group_id) && !isSaving
  const options = isSaving
    ? pots.map((p) => {
        const c = categories.find((c) => c.id === p.category_id)
        return { id: p.id, name: p.name, icon: c?.icon ?? 'piggy-bank', color: (c?.color ?? 'violet') as PaletteKey, sub: c?.name ?? 'Savings' }
      })
    : categories.filter((c) => c.kind === t.kind).map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, sub: c.kind === 'income' ? 'Income' : 'Spending' }))
  const current = options.find((o) => o.id === (editing ? pick : (t.pot_id ?? t.category_id)))
  const linked = payoutOf ? `Payout · ${payoutOf}` : t.group_id ? groupNames[t.group_id] : null
  const sign = t.kind === 'income' || t.kind === 'withdrawal' ? '+' : '−'

  const save = () =>
    start(async () => {
      setErr('')
      const res = await updateTransaction({ id: t.id, amount: Number(amt), occurredOn: date, note, categoryId: isSaving ? undefined : pick, potId: isSaving ? pick : undefined })
      if (!res.ok) return setErr(res.error)
      toast('Changes saved')
      closeDetail()
    })

  const remove = () =>
    start(async () => {
      const res = await deleteTransaction(t.id)
      if (!res.ok) return setErr(res.error)
      closeDetail()
      const label = `${KIND[t.kind]} deleted`
      if (payoutOf) toast(`${label} · the turn is ready to collect again`)
      else toast(label, () => void restoreTransaction(t))
    })

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={closeDetail} />
      <div className={`sheet${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-labelledby="tx-title" aria-hidden={!open}>
        <div className="grab" />
        <div className="sheet-h">
          <h2 id="tx-title">{editing ? `Edit ${KIND[t.kind].toLowerCase()}` : KIND[t.kind]}</h2>
          <button ref={closeBtn} className="icon-btn" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} aria-label="Close" onClick={closeDetail}>
            <Icon name="x" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          <div className="amount" style={{ paddingTop: 10 }}>
            <div className={`v num${editing && !amt ? ' zero' : ''}`} aria-live="polite" style={!editing && sign === '+' ? { color: 'var(--pos)' } : undefined}>
              {!editing && sign}
              {fmt(Number(editing ? amt || 0 : t.amount))}
              <span className="cur">FCFA</span>
            </div>
            <div className="meta">
              {editing ? (
                <button
                  className={`pill-btn date-pill${date !== today ? ' past' : ''}`}
                  aria-haspopup="dialog"
                  aria-label={`Date, ${dayLabel(date, today)}`}
                  onClick={(e) => openDate({ anchor: e.currentTarget, value: date, today, max: today, title: 'Date', quick: true, onPick: setDate })}
                >
                  <Icon name="calendar" />
                  <span>{dayLabel(date, today)}</span>
                </button>
              ) : (
                <span className="pill-btn">
                  <Icon name="calendar" />
                  <span>{dayLabel(t.occurred_on, today)}</span>
                </span>
              )}
            </div>
          </div>

          {!editing ? (
            <div className="set-group" style={{ boxShadow: 'none', background: 'var(--surface-2)', marginBottom: 14 }}>
              <div className="set-row">
                {current ? (
                  <span className="tile" style={tint(current.color)}>
                    <Icon name={current.icon} />
                  </span>
                ) : null}
                <div className="mid">
                  <b>{current?.name ?? 'Unknown'}</b>
                  <small>{isSaving ? `Savings · ${current?.sub ?? ''}` : current?.sub}</small>
                </div>
              </div>
              {t.note && (
                <div className="set-row">
                  <span className="tile" style={{ background: 'var(--surface)', color: 'var(--ink-2)' }}>
                    <Icon name="pencil-line" />
                  </span>
                  <div className="mid">
                    <b style={{ fontWeight: 500 }}>{t.note}</b>
                  </div>
                </div>
              )}
              {linked && (
                <div className="set-row">
                  <span className="tile" style={tint('amber')}>
                    <Icon name="hand-coins" />
                  </span>
                  <div className="mid">
                    <b>{linked}</b>
                    <small>Tontine</small>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {lockedCategory ? (
                <p className="hint" style={{ marginBottom: 10 }}>
                  Linked to {linked}, so the category stays the same.
                </p>
              ) : (
                <div className="catpick" role="group" aria-label={isSaving ? 'Pot' : 'Category'}>
                  {options.map((c) => (
                    <button key={c.id} className="cp" aria-pressed={c.id === pick} onClick={() => setPick(c.id)} style={{ color: `var(--pal-${c.color})` }}>
                      <span className="tile" style={tint(c.color)}>
                        <Icon name={c.icon} />
                      </span>
                      <span style={{ color: c.id === pick ? 'var(--ink)' : 'var(--ink-2)' }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <label className="note">
                <Icon name="pencil-line" />
                <span className="sr">Note</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Add a note (optional)" autoComplete="off" />
              </label>
              <Keypad onKey={(k) => setAmt((a) => pressKey(a, k))} />
            </>
          )}
        </div>

        {err && (
          <p className="form-err" role="alert" style={{ marginBottom: 8 }}>
            {err}
          </p>
        )}

        {editing ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn" style={{ flex: 1 }} disabled={!amt || !pick || pending} onClick={save}>
              <Icon name={pending ? 'loader' : 'check'} />
              Save changes
            </button>
          </div>
        ) : confirmDelete ? (
          <div className="stack" style={{ gap: 10 }}>
            <p className="hint" role="alert">
              Delete this {KIND[t.kind].toLowerCase()} of {fmt(Number(t.amount))} FCFA?
              {payoutOf ? ' Its turn will be ready to collect again, and any savings moved with it is removed.' : ''}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
                Keep it
              </button>
              <button className="btn" style={{ flex: 1, background: 'var(--neg)' }} disabled={pending} onClick={remove}>
                <Icon name={pending ? 'loader' : 'trash-2'} />
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="btn block" onClick={() => setEditing(true)}>
              <Icon name="pencil" />
              Edit
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash-2" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
