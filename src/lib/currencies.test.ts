import { describe, expect, it } from 'vitest'
import { currencyOf, searchCurrencies, CURRENCIES } from './currencies'
import { fmt } from './format'
import { pressKey, sanitizeMoney, typedLabel } from '@/components/Keypad'

describe('currencies', () => {
  it('knows FCFA has no cents and the euro has two', () => {
    expect(currencyOf('XOF')).toMatchObject({ symbol: 'FCFA', decimals: 0 })
    expect(currencyOf('EUR')).toMatchObject({ symbol: '€', decimals: 2 })
  })
  it('falls back to XOF for an unknown code', () => {
    expect(currencyOf('ZZZ').code).toBe('XOF')
  })
  it('searches by code, name or symbol, ignoring accents', () => {
    expect(searchCurrencies(CURRENCIES, 'naira').map((c) => c.code)).toEqual(['NGN'])
    expect(searchCurrencies(CURRENCIES, 'eur').map((c) => c.code)).toContain('EUR')
    expect(searchCurrencies(CURRENCIES, '€').map((c) => c.code)).toEqual(['EUR'])
  })
})

describe('fmt with cents', () => {
  it('shows whole amounts without decimals', () => {
    expect(fmt(12500)).toBe('12,500')
  })
  it('shows cents only when there are some', () => {
    expect(fmt(1250.5)).toBe('1,250.50')
    expect(fmt(0.1 + 0.2)).toBe('0.30')
  })
})

describe('keypad with decimals', () => {
  it('adds a decimal point once', () => {
    expect(pressKey('12', '.', 2)).toBe('12.')
    expect(pressKey('12.', '.', 2)).toBe('12.')
  })
  it('starts with 0. when the point comes first', () => {
    expect(pressKey('', '.', 2)).toBe('0.')
  })
  it('keeps at most two decimals', () => {
    expect(pressKey('12.50', '7', 2)).toBe('12.50')
  })
  it('ignores the point for currencies without cents', () => {
    expect(pressKey('12', '.', 0)).toBe('12')
  })
  it('deletes the last character', () => {
    expect(pressKey('12.5', 'del', 2)).toBe('12.')
  })
  it('formats what is being typed', () => {
    expect(typedLabel('12500')).toBe('12,500')
    expect(typedLabel('1250.')).toBe('1,250.')
    expect(typedLabel('1250.5')).toBe('1,250.5')
    expect(typedLabel('')).toBe('0')
  })
})

describe('sanitizeMoney (typed amount fields)', () => {
  it('keeps digits only for currencies without cents', () => {
    expect(sanitizeMoney('12,500 FCFA', 0)).toBe('12500')
    expect(sanitizeMoney('12.5', 0)).toBe('125')
  })
  it('keeps one decimal point and two decimals', () => {
    expect(sanitizeMoney('1,250.505', 2)).toBe('1250.50')
    expect(sanitizeMoney('1.2.3', 2)).toBe('1.23')
    expect(sanitizeMoney('.5', 2)).toBe('0.5')
  })
})
