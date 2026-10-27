'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { useClientValue } from './useClientValue'
import { useLang, useT } from './i18n'
import { allTimeZones, cityOf, offsetLabel, searchTimeZones, zoneLabel } from '@/lib/timezones'

const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/** Settings row showing the saved time zone; tapping it opens a searchable list. */
export function TimeZonePicker({ value, onPick }: { value: string; onPick: (tz: string) => void }) {
  const device = useClientValue<string | null>(deviceZone, null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const search = useRef<HTMLInputElement>(null)
  const zones = useMemo(() => (open ? allTimeZones() : []), [open])
  const results = useMemo(() => searchTimeZones(zones, q), [zones, q])
  const lang = useLang()
  const m = useT()
  const t = m.timeZone

  useEffect(() => {
    if (!open) return
    const f = setTimeout(() => search.current?.focus({ preventScroll: true }), 80)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(f)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (tz: string) => {
    setOpen(false)
    setQ('')
    if (tz !== value) onPick(tz)
  }
  const label = (tz: string) => zoneLabel(tz, lang)

  return (
    <>
      <button type="button" className="set-row" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
          <Icon name="clock-3" />
        </span>
        <div className="mid">
          <b>{t.title}</b>
          <small>
            {label(value)} · {offsetLabel(value)}
          </small>
        </div>
        <span className="val">
          <Icon name="chevron-right" />
        </span>
      </button>
      {device && device !== value && (
        <div className="set-row" style={{ borderTop: 0, paddingTop: 0, minHeight: 0 }}>
          <div className="mid">
            <small>{t.deviceIn(label(device))}</small>
          </div>
          <button type="button" className="btn-sm" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }} onClick={() => choose(device)}>
            {t.use(cityOf(device))}
          </button>
        </div>
      )}

      <div className={`scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} />
      <div className={`sheet tz-sheet${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-labelledby="tz-title" aria-hidden={!open}>
        <div className="grab" />
        <div className="sheet-h">
          <h2 id="tz-title">{t.title}</h2>
          <button className="icon-btn" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} aria-label={m.common.close} onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </div>
        <label className="search" style={{ boxShadow: 'none', background: 'var(--surface-2)', marginBottom: 10 }}>
          <Icon name="search" />
          <span className="sr">{t.search}</span>
          <input ref={search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} autoComplete="off" />
        </label>
        <div className="tz-list" role="listbox" aria-label={t.list}>
          {device && !q && (
            <button type="button" className="row" role="option" aria-selected={device === value} onClick={() => choose(device)}>
              <span className="tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
                <Icon name="smartphone" />
              </span>
              <span className="mid">
                <b>{t.useDevice}</b>
                <small>
                  {t.detected(label(device))} · {offsetLabel(device)}
                </small>
              </span>
              {device === value && <Icon name="check" style={{ color: 'var(--brand-ink)' }} />}
            </button>
          )}
          {results.map((tz) => (
            <button key={tz} type="button" className="row" role="option" aria-selected={tz === value} onClick={() => choose(tz)}>
              <span className="mid">
                <b>{label(tz)}</b>
                <small>
                  {tz.replace(/_/g, ' ')} · {offsetLabel(tz)}
                </small>
              </span>
              {tz === value && <Icon name="check" style={{ color: 'var(--brand-ink)' }} />}
            </button>
          ))}
          {open && results.length === 0 && (
            <div className="empty">
              <Icon name="search-x" />
              <p>{t.noMatch(q)}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
