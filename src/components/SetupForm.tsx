'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { Tile } from './ui'
import { useToast } from './Toast'
import { useCurrency } from './currency'
import { sanitizeMoney, typedLabel } from './Keypad'
import { saveStartingBalances } from '@/lib/actions'
import { sinceLabel } from '@/lib/format'
import type { Category, Pot } from '@/lib/types'


export function SetupForm({ cats, pots, openingCash, welcome }: { cats: Category[]; pots: Pot[]; openingCash: number; welcome: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const cur = useCurrency()
  const [pending, start] = useTransition()
  const [cash, setCash] = useState(String(openingCash || ''))
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(pots.map((p) => [p.id, String(p.initial_amount || '')])))
  const [err, setErr] = useState('')

  const save = () =>
    start(async () => {
      const res = await saveStartingBalances({ openingCash: Number(cash || 0), pots: pots.map((p) => ({ id: p.id, initial: Number(vals[p.id] || 0) })) })
      if (!res.ok) return setErr(res.error)
      toast('Starting balances saved')
      router.push(welcome ? '/' : '/savings')
    })

  return (
    <>
      <div className="stack">
        <div className="panel">
          <div className="field" style={{ borderTop: 0, paddingTop: 0 }}>
            <label htmlFor="cash">
              <Tile icon="wallet" color="violet" />
              Cash and current account
            </label>
            <div className="money">
              <input id="cash" inputMode={cur.decimals ? 'decimal' : 'numeric'} value={cash ? typedLabel(cash) : ''} onChange={(e) => setCash(sanitizeMoney(e.target.value, cur.decimals))} placeholder="0" />
              <span className="cur-label" />
            </div>
            <span className="hint">Money you can spend today. It becomes your “Available” balance.</span>
          </div>
        </div>
        {cats.map((g) => {
          const mine = pots.filter((p) => p.category_id === g.id)
          return (
            <div key={g.id} className="panel">
              <div className="group-h" style={{ marginBottom: 10 }}>
                <Tile icon={g.icon} color={g.color} />
                <div className="t">
                  <b>{g.name}</b>
                  <small>{g.description ?? ''}</small>
                </div>
              </div>
              {mine.map((p) => (
                <div key={p.id} className="field">
                  <label htmlFor={`in-${p.id}`}>{p.name}</label>
                  <div className="money">
                    <input id={`in-${p.id}`} inputMode={cur.decimals ? 'decimal' : 'numeric'} value={vals[p.id] ? typedLabel(vals[p.id]) : ''} onChange={(e) => setVals({ ...vals, [p.id]: sanitizeMoney(e.target.value, cur.decimals) })} placeholder="0" />
                    <span className="cur-label" />
                  </div>
                  <span className="hint">As of {sinceLabel(p.started_on)}</span>
                </div>
              ))}
              <Link className="pocket" style={{ color: 'var(--brand-ink)', fontWeight: 560, gap: 10 }} href={`/savings/pots/new?category=${g.id}`}>
                <Icon name="plus" size={18} />
                {mine.length ? `Add another ${g.name.toLowerCase()} pot` : `Add a ${g.name.toLowerCase()} pot`}
              </Link>
            </div>
          )
        })}
      </div>
      {err && (
        <p className="form-err" role="alert" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Link className="btn ghost" href={welcome ? '/' : '/savings'}>
          {welcome ? 'Skip for now' : 'Cancel'}
        </Link>
        <button className="btn" style={{ flex: 1 }} disabled={pending} onClick={save}>
          <Icon name={pending ? 'loader' : 'check'} />
          Save balances
        </button>
      </div>
    </>
  )
}
