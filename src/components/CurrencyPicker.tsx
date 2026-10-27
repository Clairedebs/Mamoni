'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { applyCurrency } from './currency'
import { useLang, useT } from './i18n'
import { changeCurrency } from '@/lib/actions'
import { CURRENCIES, currencyName, currencyOf, searchCurrencies, type Currency } from '@/lib/currencies'

/** Settings row for the account currency; picking another one asks to confirm the relabel. */
export function CurrencyPicker({ value }: { value: string }) {
  const toast = useToast()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState<Currency | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const current = currencyOf(value)
  const results = useMemo(() => searchCurrencies(CURRENCIES, q), [q])
  const lang = useLang()
  const m = useT()
  const t = m.currency
  const name = (c: Currency) => currencyName(c, lang)

  useEffect(() => {
    if (!open) return
    const f = setTimeout(() => search.current?.focus({ preventScroll: true }), 80)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(f)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    setConfirm(null)
    setQ('')
  }

  const switchTo = (c: Currency) =>
    start(async () => {
      const res = await changeCurrency(c.code)
      if (!res.ok) return toast(res.error)
      applyCurrency(c.code)
      close()
      toast(t.nowShownIn(name(c)))
    })

  return (
    <>
      <button type="button" className="set-row" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
          <Icon name="coins" />
        </span>
        <div className="mid">
          <b>{t.title}</b>
          <small>
            {name(current)} ({current.symbol})
          </small>
        </div>
        <span className="val">
          <Icon name="chevron-right" />
        </span>
      </button>

      <div className={`scrim${open ? ' on' : ''}`} onClick={close} />
      <div className={`sheet tz-sheet${open ? ' on' : ''}`} role="dialog" aria-modal="true" aria-labelledby="cur-title" aria-hidden={!open}>
        <div className="grab" />
        <div className="sheet-h">
          <h2 id="cur-title">{confirm ? t.switchTitle(name(confirm)) : t.title}</h2>
          <button className="icon-btn" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} aria-label={m.common.close} onClick={close}>
            <Icon name="x" />
          </button>
        </div>

        {confirm ? (
          <div className="stack" style={{ gap: 14 }}>
            <div className="notice">
              <Icon name="tag" />
              <span>{t.relabel(current.symbol, confirm.symbol)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn ghost" onClick={() => setConfirm(null)} disabled={pending}>
                {t.keep(current.symbol)}
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => switchTo(confirm)} disabled={pending}>
                <Icon name={pending ? 'loader' : 'check'} />
                {t.switchTo(confirm.symbol)}
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="search" style={{ boxShadow: 'none', background: 'var(--surface-2)', marginBottom: 10 }}>
              <Icon name="search" />
              <span className="sr">{t.search}</span>
              <input ref={search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} autoComplete="off" />
            </label>
            <div className="tz-list" role="listbox" aria-label={t.list}>
              {results.map((c) => (
                <button key={c.code} type="button" className="row" role="option" aria-selected={c.code === current.code} onClick={() => (c.code === current.code ? close() : setConfirm(c))}>
                  <span className="tile cur-tile" aria-hidden="true">
                    {c.symbol}
                  </span>
                  <span className="mid">
                    <b>{name(c)}</b>
                    <small>
                      {c.code} · {c.decimals ? t.withCents : t.noCents}
                    </small>
                  </span>
                  {c.code === current.code && <Icon name="check" style={{ color: 'var(--brand-ink)' }} />}
                </button>
              ))}
              {results.length === 0 && (
                <div className="empty">
                  <Icon name="search-x" />
                  <p>{t.noMatch(q)}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
