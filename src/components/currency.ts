'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { CURRENCY_KEY as KEY, currencyOf, DEFAULT_CURRENCY, type Currency } from '@/lib/currencies'

const EVENT = 'mm-currency'

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_CURRENCY
  } catch {
    return DEFAULT_CURRENCY
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export function applyCurrency(code: string) {
  const c = currencyOf(code)
  document.documentElement.style.setProperty('--cur', JSON.stringify(c.symbol))
  try {
    if (localStorage.getItem(KEY) === c.code) return
    localStorage.setItem(KEY, c.code)
    localStorage.setItem(`${KEY}-symbol`, c.symbol)
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

/** The account currency, for text that CSS labels can't reach (toasts, buttons, keypad decimals). */
export function useCurrency(): Currency {
  return currencyOf(useSyncExternalStore(subscribe, read, () => DEFAULT_CURRENCY))
}

/** Rendered once with the profile's currency so every screen picks it up. */
export function CurrencySync({ code }: { code: string }) {
  useEffect(() => applyCurrency(code), [code])
  return null
}
