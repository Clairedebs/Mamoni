'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { applyCurrency } from './currency'
import { changeCurrency } from '@/lib/actions'
import { CURRENCIES, currencyOf, searchCurrencies, type Currency } from '@/lib/currencies'

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
      toast(`Amounts are now shown in ${c.name}`)
    })

  return (
    <>
      <button type="button" className="set-row" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
          <Icon name="coins" />
        </span>
        <div className="mid">
          <b>Currency</b>
          <small>
            {current.name} ({current.symbol})
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
          <h2 id="cur-title">{confirm ? `Switch to ${confirm.name}?` : 'Currency'}</h2>
          <button className="icon-btn" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} aria-label="Close" onClick={close}>
            <Icon name="x" />
          </button>
        </div>

        {confirm ? (
          <div className="stack" style={{ gap: 14 }}>
            <div className="notice">
              <Icon name="tag" />
              <span>
                Your amounts stay the same numbers: 12,500 {current.symbol} becomes 12,500 {confirm.symbol}. Nothing is converted. Use this if you picked the wrong currency.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn ghost" onClick={() => setConfirm(null)} disabled={pending}>
                Keep {current.symbol}
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => switchTo(confirm)} disabled={pending}>
                <Icon name={pending ? 'loader' : 'check'} />
                Switch to {confirm.symbol}
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="search" style={{ boxShadow: 'none', background: 'var(--surface-2)', marginBottom: 10 }}>
              <Icon name="search" />
              <span className="sr">Search a currency</span>
              <input ref={search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a currency" autoComplete="off" />
            </label>
            <div className="tz-list" role="listbox" aria-label="Currencies">
              {results.map((c) => (
                <button key={c.code} type="button" className="row" role="option" aria-selected={c.code === current.code} onClick={() => (c.code === current.code ? close() : setConfirm(c))}>
                  <span className="tile cur-tile" aria-hidden="true">
                    {c.symbol}
                  </span>
                  <span className="mid">
                    <b>{c.name}</b>
                    <small>
                      {c.code} · {c.decimals ? 'with cents' : 'no cents'}
                    </small>
                  </span>
                  {c.code === current.code && <Icon name="check" style={{ color: 'var(--brand-ink)' }} />}
                </button>
              ))}
              {results.length === 0 && (
                <div className="empty">
                  <Icon name="search-x" />
                  <p>No currency matches “{q}”.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
