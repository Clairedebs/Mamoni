'use client'

import { Icon } from './Icon'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del']

/** Applies one keypad key to an amount string (digits only, max 10). */
export function pressKey(amount: string, k: string) {
  if (k === 'del') return amount.slice(0, -1)
  if (amount === '' && (k === '0' || k === '000')) return amount
  return (amount + k).slice(0, 10)
}

export function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="pad">
      {KEYS.map((k) => (
        <button key={k} type="button" className="key" aria-label={k === 'del' ? 'Delete' : k} onClick={() => onKey(k)}>
          {k === 'del' ? <Icon name="delete" /> : k === '000' ? <small>000</small> : k}
        </button>
      ))}
    </div>
  )
}
