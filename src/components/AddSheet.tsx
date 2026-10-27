'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from './Icon'
import { useAddSheet } from './AppShell'
import { Keypad, pressKey, typedLabel } from './Keypad'
import { useCurrency } from './currency'
import { useLang, useT } from './i18n'
import { usePickers } from './Pickers'
import { useToast } from './Toast'
import { addTransaction, deleteTransaction } from '@/lib/actions'
import { dayLabel, fmt, tint } from '@/lib/format'
import type { Category, Pot, TransactionKind } from '@/lib/types'

type Tab = 'expense' | 'income' | 'saving'

export type SheetGroup = { id: string; name: string; perPeriod: number; frequency: 'weekly' | 'monthly' }

export function AddSheet({ categories, pots, groups, today }: { categories: Category[]; pots: Pot[]; groups: SheetGroup[]; today: string }) {
  const { req, close } = useAddSheet()
  const { openDate } = usePickers()
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const cur = useCurrency()
  const lang = useLang()
  const m = useT()
  const s = m.addSheet
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('expense')
  const [dir, setDir] = useState<'deposit' | 'withdrawal'>('deposit')
  const [amt, setAmt] = useState('')
  const [pick, setPick] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [err, setErr] = useState('')
  const [seen, setSeen] = useState<number | null>(null)
  const [groupId, setGroupId] = useState('')
  const lastFocus = useRef<Element | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  const savingCats = categories.filter((c) => c.kind === 'saving')
  const options =
    tab === 'saving'
      ? pots.map((p) => {
          const c = savingCats.find((c) => c.id === p.category_id)
          return { id: p.id, name: p.name, icon: c?.icon ?? 'piggy-bank', color: c?.color ?? 'violet' }
        })
      : categories.filter((c) => c.kind === tab).map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))
  const current = options.find((o) => o.id === pick)
  const kind: TransactionKind = tab === 'saving' ? dir : tab
  const isTontine = tab === 'expense' && categories.find((c) => c.id === pick)?.role === 'tontine'
  const group = groups.find((g) => g.id === groupId)
  const needsGroup = isTontine && groups.length > 0 && !group

  // A new open request resets the form (state adjusted during render, not in an effect).
  if (req && req.nonce !== seen) {
    const t: Tab = req.kind === 'deposit' || req.kind === 'withdrawal' ? 'saving' : req.kind
    const first = t === 'saving' ? pots[0]?.id : categories.find((c) => c.kind === t)?.id
    setSeen(req.nonce)
    setTab(t)
    setDir(req.kind === 'withdrawal' ? 'withdrawal' : 'deposit')
    setAmt(req.amount ? String(req.amount) : '')
    setNote('')
    setErr('')
    setDate(today)
    setPick(req.potId ?? req.categoryId ?? first ?? '')
    setGroupId(req.groupId ?? (groups.length === 1 ? groups[0].id : ''))
    setOpen(true)
  }

  useEffect(() => {
    if (!req) return
    lastFocus.current = document.activeElement
    const f = setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(f)
  }, [req])

  const shut = () => {
    setOpen(false)
    close()
    ;(lastFocus.current as HTMLElement | null)?.focus?.({ preventScroll: true })
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setErr('')
    setPick((t === 'saving' ? pots[0]?.id : categories.find((c) => c.kind === t)?.id) ?? '')
  }

  const press = (k: string) => setAmt((a) => pressKey(a, k, cur.decimals))

  const save = () => {
    if (!amt || !pick || pending || needsGroup) return
    setErr('')
    start(async () => {
      const res = await addTransaction({
        kind,
        amount: Number(amt),
        categoryId: tab === 'saving' ? undefined : pick,
        potId: tab === 'saving' ? pick : undefined,
        occurredOn: date,
        note,
        groupId: isTontine && group ? group.id : undefined,
      })
      if (!res.ok) return setErr(res.error)
      shut()
      toast(`${s.saved[kind](`${fmt(Number(amt))} ${cur.symbol}`)}${date !== today ? ` · ${dayLabel(date, today, lang)}` : ''}`, async () => {
        await deleteTransaction(res.data.id)
        router.refresh()
      })
    })
  }

  // Keyboard entry on desktop
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.picker.on')) return
      if (e.key === 'Escape') return shut()
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (/^\d$/.test(e.key)) {
        press(e.key)
        e.preventDefault()
      } else if (e.key === 'Backspace') {
        press('del')
        e.preventDefault()
      } else if (e.key === 'Enter') save()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const tabs: [Tab, string][] = [
    ['expense', s.tabs.expense],
    ['income', s.tabs.income],
    ['saving', s.tabs.saving],
  ]
  const tabIdx = tabs.findIndex(([t]) => t === tab)

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={shut} />
      <div className={`sheet${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title" aria-hidden={!open}>
        <div className="grab" />
        <div className="sheet-h">
          <h2 id="sheet-title">{s.title}</h2>
          <button ref={closeBtn} className="icon-btn" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} aria-label={m.common.close} onClick={shut}>
            <Icon name="x" />
          </button>
        </div>
        <div className="type-seg" role="group" aria-label={s.type}>
          <span className="thumb" style={{ transform: `translateX(${tabIdx * 100}%)` }} />
          {tabs.map(([t, l]) => (
            <button key={t} aria-pressed={tab === t} onClick={() => switchTab(t)}>
              {l}
            </button>
          ))}
        </div>

        <div className="amount">
          <div className={`v num${amt ? '' : ' zero'}`} aria-live="polite">
            {typedLabel(amt)}
            <span className="cur" />
          </div>
          <div className="meta">
            <button
              className={`pill-btn date-pill${date !== today ? ' past' : ''}`}
              aria-haspopup="dialog"
              aria-label={s.dateAria(dayLabel(date, today, lang))}
              onClick={(e) => openDate({ anchor: e.currentTarget, value: date, today, max: today, title: s.dateTitle, quick: true, onPick: setDate })}
            >
              <Icon name="calendar" />
              <span>{dayLabel(date, today, lang)}</span>
            </button>
            {tab === 'saving' && pots.length > 0 && (
              <span className="mini-chips" style={{ flexBasis: 'auto' }} role="group" aria-label={s.direction}>
                {(['deposit', 'withdrawal'] as const).map((d) => (
                  <button key={d} className="chipsel" aria-pressed={dir === d} onClick={() => setDir(d)}>
                    {d === 'deposit' ? s.deposit : s.withdraw}
                  </button>
                ))}
              </span>
            )}
            {tab !== 'saving' && current && (
              <span className="pill-btn">
                <Icon name="tag" />
                <span>{current.name}</span>
              </span>
            )}
          </div>
        </div>

        {tab === 'saving' && pots.length === 0 ? (
          <div className="empty-card">
            <b>{s.noPots}</b>
            <p>{s.noPotsBody}</p>
            <Link className="btn-sm" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)', display: 'inline-flex' }} href="/savings/pots/new" onClick={shut}>
              <Icon name="plus" />
              {s.newPot}
            </Link>
          </div>
        ) : (
          <div className="catpick" role="group" aria-label={tab === 'saving' ? m.common.pot : m.common.category}>
            {options.map((c) => (
              <button key={c.id} className="cp" aria-pressed={c.id === pick} onClick={() => setPick(c.id)} style={{ color: `var(--pal-${c.color})` }}>
                <span className="tile" style={tint(c.color)}>
                  <Icon name={c.icon} />
                </span>
                <span style={{ color: c.id === pick ? 'var(--ink)' : 'var(--ink-2)' }}>{c.name}</span>
              </button>
            ))}
            {tab !== 'saving' && (
              <Link className="cp add" href={`/settings/categories/new?kind=${tab}&from=sheet`} onClick={shut}>
                <span className="tile">
                  <Icon name="plus" />
                </span>
                <span>{s.newCategory}</span>
              </Link>
            )}
          </div>
        )}

        {isTontine && groups.length > 0 && (
          <div className="stack" style={{ gap: 8, marginBottom: 10 }}>
            {groups.length > 1 && (
              <div className="mini-chips" role="group" aria-label={s.tontineGroup}>
                {groups.map((g) => (
                  <button key={g.id} className="chipsel" aria-pressed={groupId === g.id} onClick={() => setGroupId(g.id)}>
                    {g.name}
                  </button>
                ))}
              </div>
            )}
            {group && (
              <div className="mini-chips" role="group" aria-label={s.shortcuts}>
                {[1, 4].map((n) => (
                  <button key={n} className="chipsel" aria-pressed={amt === String(group.perPeriod * n)} onClick={() => setAmt(String(group.perPeriod * n))}>
                    {s.periods(n, group.frequency === 'weekly')} · {fmt(group.perPeriod * n)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <label className="note">
          <Icon name="pencil-line" />
          <span className="sr">{m.common.note}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder={m.common.addNote} autoComplete="off" />
        </label>
        <Keypad onKey={press} decimals={cur.decimals} />
        {err && (
          <p className="form-err" role="alert" style={{ marginBottom: 8 }}>
            {err}
          </p>
        )}
        <button className="btn block" disabled={!amt || !pick || pending || needsGroup} onClick={save}>
          <Icon name={pending ? 'loader' : 'check'} />
          {pending ? s.saving : s.save[kind]}
        </button>
      </div>
    </>
  )
}
