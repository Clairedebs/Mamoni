import { describe, expect, it } from 'vitest'
import { validateTxEdit } from './tx'

describe('validateTxEdit', () => {
  const ok = { amount: 12500, occurredOn: '2026-10-20', today: '2026-10-21' }
  it('accepts a valid edit', () => {
    expect(validateTxEdit(ok)).toBeNull()
  })
  it('needs a positive whole amount', () => {
    expect(validateTxEdit({ ...ok, amount: 0 })).toBe('Enter an amount.')
    expect(validateTxEdit({ ...ok, amount: 12.555 })).toBe('Enter an amount.')
  })
  it('accepts cents', () => {
    expect(validateTxEdit({ ...ok, amount: 12.5 })).toBeNull()
  })
  it('needs a real date', () => {
    expect(validateTxEdit({ ...ok, occurredOn: '20-10-2026' })).toBe('Pick a valid date.')
  })
  it('refuses future dates', () => {
    expect(validateTxEdit({ ...ok, occurredOn: '2026-10-22' })).toBe('The date can’t be in the future.')
  })
})
