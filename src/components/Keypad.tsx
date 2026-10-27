'use client'

import { Icon } from './Icon'
import { useT } from './i18n'

/** Applies one keypad key to an amount string: digits, at most one ".", `decimals` digits after it. */
export function pressKey(amount: string, k: string, decimals = 0) {
  if (k === 'del') return amount.slice(0, -1)
  const [whole, frac] = amount.split('.')
  if (k === '.') {
    if (!decimals || frac !== undefined) return amount
    return `${whole || '0'}.`
  }
  if (frac !== undefined) return frac.length + k.length > decimals ? amount : amount + k
  if (amount === '' && (k === '0' || k === '000')) return amount
  return (amount + k).slice(0, 10)
}

/** Groups the whole part of a typed amount, keeping a trailing "." or partial cents. */
export function typedLabel(amount: string) {
  if (!amount) return '0'
  const [whole, frac] = amount.split('.')
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? grouped : `${grouped}.${frac}`
}

/** Cleans what was typed in an amount field: digits, and for currencies with cents one "." and two decimals. */
export function sanitizeMoney(raw: string, decimals = 0) {
  if (!decimals) return raw.replace(/\D/g, '').slice(0, 10)
  const cleaned = raw.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned.slice(0, 10)
  const whole = cleaned.slice(0, dot).slice(0, 10) || '0'
  const frac = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, decimals)
  return `${whole}.${frac}`
}

export function Keypad({ onKey, decimals = 0 }: { onKey: (k: string) => void; decimals?: number }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals ? '.' : '000', '0', 'del']
  const m = useT()
  return (
    <div className="pad">
      {keys.map((k) => (
        <button key={k} type="button" className="key" aria-label={k === 'del' ? m.keypad.delete : k === '.' ? m.keypad.decimal : k} onClick={() => onKey(k)}>
          {k === 'del' ? <Icon name="delete" /> : k === '000' ? <small>000</small> : k === '.' ? <span aria-hidden="true">.</span> : k}
        </button>
      ))}
    </div>
  )
}
