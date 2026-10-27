'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { useLang, useT } from './i18n'
import { addDays, fullDate, isoOf, pad2, parseIso, shortDate } from '@/lib/format'

type DateOpts = { anchor: HTMLElement; value: string; today: string; min?: string; max?: string; title: string; quick?: boolean; onPick: (v: string) => void }
type TimeOpts = { anchor: HTMLElement; value: string; title: string; onPick: (v: string) => void }
type State = ({ kind: 'date' } & DateOpts) | ({ kind: 'time' } & TimeOpts)

const Ctx = createContext<{ openDate: (o: DateOpts) => void; openTime: (o: TimeOpts) => void }>({ openDate: () => {}, openTime: () => {} })
export const usePickers = () => useContext(Ctx)

export function PickerProvider({ children }: { children: React.ReactNode }) {
  const [st, setSt] = useState<State | null>(null)
  const [on, setOn] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOn(false)
    setSt((s) => {
      s?.anchor.focus({ preventScroll: true })
      return s
    })
  }, [])

  const openDate = useCallback((o: DateOpts) => {
    setSt({ kind: 'date', ...o })
    requestAnimationFrame(() => setOn(true))
  }, [])
  const openTime = useCallback((o: TimeOpts) => {
    setSt({ kind: 'time', ...o })
    requestAnimationFrame(() => setOn(true))
  }, [])

  // Desktop: anchor the popover to its trigger, flipping above when there is no room below.
  useLayoutEffect(() => {
    const el = panel.current
    if (!st || !el || !matchMedia('(min-width:1024px)').matches) return
    const r = st.anchor.getBoundingClientRect()
    const w = 336
    const h = el.offsetHeight
    const x = Math.min(Math.max(12, r.left), innerWidth - w - 12)
    let y = r.bottom + 8
    let o = 'top'
    if (y + h > innerHeight - 12) {
      y = Math.max(12, r.top - h - 8)
      o = 'bottom'
    }
    el.style.setProperty('--px', `${x}px`)
    el.style.setProperty('--py', `${y}px`)
    el.style.setProperty('--po', `${o} ${r.left + r.width / 2 - x}px`)
  }, [st])

  useEffect(() => {
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        close()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [on, close])

  return (
    <Ctx.Provider value={{ openDate, openTime }}>
      {children}
      <div className={`pk-scrim${on ? ' on' : ''}`} onClick={close} />
      <div ref={panel} className={`picker${on ? ' on' : ''}`} role="dialog" aria-modal="true" aria-labelledby="pk-title" aria-hidden={!on}>
        <div className="grab" />
        {st?.kind === 'date' && <Calendar key={`${st.title}${st.value}`} o={st} done={close} />}
        {st?.kind === 'time' && <TimeWheels key={`${st.title}${st.value}`} o={st} done={close} />}
      </div>
    </Ctx.Provider>
  )
}

function Calendar({ o, done }: { o: DateOpts; done: () => void }) {
  const lang = useLang()
  const m = useT()
  const [sel, setSel] = useState(o.value)
  const [focus, setFocus] = useState(o.value)
  const [view, setView] = useState(() => {
    const d = parseIso(o.value)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const grid = useRef<HTMLDivElement>(null)
  const dir = useRef(0)
  const inRange = (iso: string) => (!o.min || iso >= o.min) && (!o.max || iso <= o.max)

  const y = view.getFullYear()
  const mo = view.getMonth()
  const off = (new Date(y, mo, 1).getDay() + 6) % 7
  const days = new Date(y, mo + 1, 0).getDate()
  const first = isoOf(new Date(y, mo, 1))
  const last = isoOf(new Date(y, mo, days))

  useEffect(() => {
    if (dir.current && grid.current && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      grid.current.animate([{ opacity: 0, transform: `translateX(${dir.current * 14}px)` }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' })
    dir.current = 0
  }, [view])

  useEffect(() => {
    const t = setTimeout(() => grid.current?.querySelector<HTMLButtonElement>(`[data-d="${focus}"]`)?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(t)
  }, [focus])

  const move = (d: number) => {
    dir.current = d
    setView(new Date(y, mo + d, 1))
  }
  const pick = (iso: string) => {
    setSel(iso)
    setTimeout(() => {
      o.onPick(iso)
      done()
    }, 160)
  }
  const onKey = (e: React.KeyboardEvent, iso: string) => {
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key]
    if (!step) return
    e.preventDefault()
    const next = addDays(iso, step)
    if (!inRange(next)) return
    const nd = parseIso(next)
    if (nd.getMonth() !== mo || nd.getFullYear() !== y) {
      dir.current = Math.sign(step)
      setView(new Date(nd.getFullYear(), nd.getMonth(), 1))
    }
    setFocus(next)
  }

  const quick = o.quick
    ? [
        [m.date.today, o.today],
        [m.date.yesterday, addDays(o.today, -1)],
        [m.date.twoDaysAgo, addDays(o.today, -2)],
      ]
    : []

  return (
    <>
      <div className="pk-head">
        <div>
          <small id="pk-title">{o.title}</small>
          <strong>{shortDate(sel, lang)}</strong>
        </div>
      </div>
      {quick.length > 0 && (
        <div className="pk-quick" role="group" aria-label={m.picker.shortcuts}>
          {quick.map(([l, v]) => (
            <button key={l} className="chipsel" aria-pressed={sel === v} onClick={() => pick(v)}>
              {l}
            </button>
          ))}
        </div>
      )}
      <div className="cal-nav">
        <button onClick={() => move(-1)} disabled={!!o.min && first <= o.min} aria-label={m.picker.prevMonth}>
          <Icon name="chevron-left" />
        </button>
        <span aria-live="polite">{m.date.monthYear(m.date.longMonths[mo], y)}</span>
        <button onClick={() => move(1)} disabled={!!o.max && last >= o.max} aria-label={m.picker.nextMonth}>
          <Icon name="chevron-right" />
        </button>
      </div>
      <div className="cal-wd" aria-hidden="true">
        {m.date.weekLetters.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="cal-grid" ref={grid}>
        {Array.from({ length: off }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const dt = new Date(y, mo, i + 1)
          const iso = isoOf(dt)
          const tabbable = iso === focus || (!inRange(focus) && i === 0)
          return (
            <button
              key={iso}
              data-d={iso}
              className={`cal-d${iso === o.today ? ' today' : ''}`}
              aria-pressed={iso === sel}
              disabled={!inRange(iso)}
              tabIndex={tabbable ? 0 : -1}
              aria-label={`${fullDate(iso, lang)}${iso === o.today ? m.picker.todaySuffix : ''}`}
              onClick={() => pick(iso)}
              onKeyDown={(e) => onKey(e, iso)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINS = Array.from({ length: 12 }, (_, i) => i * 5)
const PRESETS = [
  ['morning', '07:00'],
  ['lunch', '12:30'],
  ['evening', '20:30'],
  ['bedtime', '22:00'],
] as const

function TimeWheels({ o, done }: { o: TimeOpts; done: () => void }) {
  const m = useT().picker
  const hRef = useRef<HTMLDivElement>(null)
  const mRef = useRef<HTMLDivElement>(null)
  const [hi, setHi] = useState(() => Number(o.value.slice(0, 2)))
  const [mi, setMi] = useState(() => Math.round(Number(o.value.slice(3, 5)) / 5) % 12)
  const value = `${pad2(HOURS[hi])}:${pad2(MINS[mi])}`

  const scrollTo = (el: HTMLDivElement | null, i: number, smooth: boolean) => el?.scrollTo({ top: i * 40, behavior: smooth ? 'smooth' : 'instant' })

  useLayoutEffect(() => {
    scrollTo(hRef.current, hi, false)
    scrollTo(mRef.current, mi, false)
    // initial position only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wheel = (ref: React.RefObject<HTMLDivElement | null>, items: number[], cur: number, set: (i: number) => void, label: string) => {
    let raf = 0
    return (
      <div
        ref={ref}
        className="wheel"
        role="listbox"
        tabIndex={0}
        aria-label={label}
        onScroll={(e) => {
          const el = e.currentTarget
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(() => set(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / 40)))))
        }}
        onKeyDown={(e) => {
          const d = ({ ArrowUp: -1, ArrowDown: 1 } as Record<string, number>)[e.key]
          if (!d) return
          e.preventDefault()
          scrollTo(ref.current, Math.min(items.length - 1, Math.max(0, cur + d)), true)
        }}
      >
        <div className="pad" />
        {items.map((v, i) => (
          <div key={v} className={`it${i === cur ? ' sel' : ''}`} role="option" aria-selected={i === cur} onClick={() => scrollTo(ref.current, i, true)}>
            {pad2(v)}
          </div>
        ))}
        <div className="pad" />
      </div>
    )
  }

  return (
    <>
      <div className="pk-head">
        <div>
          <small id="pk-title">{o.title}</small>
          <strong className="num">{value}</strong>
        </div>
      </div>
      <div className="pk-quick" role="group" aria-label={m.presets}>
        {PRESETS.map(([l, v]) => (
          <button
            key={l}
            className="chipsel"
            aria-pressed={value === v}
            onClick={() => {
              scrollTo(hRef.current, Number(v.slice(0, 2)), true)
              scrollTo(mRef.current, Number(v.slice(3)) / 5, true)
            }}
          >
            {m.presetNames[l]}
          </button>
        ))}
      </div>
      <div className="wheels">
        <div className="band" aria-hidden="true" />
        {wheel(hRef, HOURS, hi, setHi, m.hours)}
        <span className="colon" aria-hidden="true">
          :
        </span>
        {wheel(mRef, MINS, mi, setMi, m.minutes)}
      </div>
      <button
        className="btn block"
        onClick={() => {
          o.onPick(value)
          done()
        }}
      >
        <Icon name="check" />
        {m.setTime}
      </button>
    </>
  )
}
