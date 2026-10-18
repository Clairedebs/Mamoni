import { describe, expect, it } from 'vitest'
import { coverage, deadlines, estimateCycleEnd, rebase, statusLine, validatePayout } from './tontine'
import { shortDate } from './format'

const W = {
  firstDue: '2026-10-24',
  cycleEnd: '2027-01-16',
  frequency: 'weekly' as const,
  perPeriod: 5000,
  openingCredit: 0,
  deadlineMinutes: 1080,
}

describe('coverage', () => {
  it('four weeks paid ahead covers until the fourth Friday', () => {
    const c = coverage({ ...W, paid: 20000, today: '2026-10-22', nowMinutes: 600 })
    expect(c.coveredUntil).toBe('2026-11-14')
    expect(c.nextDue).toBe('2026-11-21')
    expect(c.nextDueAmount).toBe(5000)
    expect(c.credit).toBe(0)
  })

  it('an odd amount keeps the remainder as credit', () => {
    const c = coverage({ ...W, paid: 12000, today: '2026-10-22', nowMinutes: 600 })
    expect(c.coveredUntil).toBe('2026-10-31')
    expect(c.credit).toBe(2000)
    expect(c.nextDueAmount).toBe(3000)
  })

  it('behind when first deadline already passed', () => {
    const c = coverage({ ...W, paid: 0, today: '2026-10-27', nowMinutes: 600 })
    expect(c.behindCount).toBe(1)
    expect(c.behindAmount).toBe(5000)
    expect(c.coveredUntil).toBeNull()
  })

  it('deadline day counts until deadline time', () => {
    expect(coverage({ ...W, paid: 0, today: '2026-10-24', nowMinutes: 1079 }).behindCount).toBe(0)
    expect(coverage({ ...W, paid: 0, today: '2026-10-24', nowMinutes: 1080 }).behindCount).toBe(1)
  })

  it('late payment fills oldest first', () => {
    const c = coverage({ ...W, paid: 5000, today: '2026-11-02', nowMinutes: 600 })
    expect(c.behindCount).toBe(1)
    expect(c.coveredUntil).toBe('2026-10-24')
    expect(c.missedDeadlines).toEqual(['2026-10-31'])
  })

  it('overpayment beyond cycle end becomes extra credit', () => {
    const c = coverage({ ...W, paid: 13 * 5000 + 7000, today: '2026-10-22', nowMinutes: 600 })
    expect(c.fullyPaid).toBe(true)
    expect(c.extraCredit).toBe(7000)
    expect(c.nextDue).toBeNull()
  })

  it('opening credit counts like a payment', () => {
    const c = coverage({ ...W, openingCredit: 2000, paid: 3000, today: '2026-10-22', nowMinutes: 600 })
    expect(c.coveredUntil).toBe('2026-10-24')
    expect(c.credit).toBe(0)
  })
})

describe('deadlines', () => {
  it('weekly deadlines step by seven days through the cycle end', () => {
    const d = deadlines('2026-10-24', '2027-01-16', 'weekly')
    expect(d).toHaveLength(13)
    expect(d.at(-1)).toBe('2027-01-16')
  })

  it('monthly deadlines clamp to month end and recover', () => {
    expect(deadlines('2027-01-31', '2027-04-30', 'monthly')).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'])
  })

  it('a rebased monthly start keeps the anchor day', () => {
    expect(deadlines('2027-02-28', '2027-04-30', 'monthly', 31)).toEqual(['2027-02-28', '2027-03-31', '2027-04-30'])
  })
})

it('estimateCycleEnd adds names minus one periods', () => {
  expect(estimateCycleEnd('2026-09-05', 20, 'weekly')).toBe('2027-01-16')
})

describe('rebase', () => {
  it('rebase keeps covered deadlines and credit', () => {
    const c = coverage({ ...W, paid: 22000, today: '2026-10-22', nowMinutes: 600 })
    expect(rebase(c)).toEqual({ firstDue: '2026-11-21', openingCredit: 2000 })
  })

  it('rebase restarts at the oldest missed deadline when behind', () => {
    const c = coverage({ ...W, paid: 0, today: '2026-11-02', nowMinutes: 600 })
    expect(rebase(c).firstDue).toBe('2026-10-24')
  })
})

describe('statusLine', () => {
  const opts = { today: '2026-10-22', turnToday: false, label: shortDate }

  it('shows covered until when paid ahead', () => {
    const c = coverage({ ...W, paid: 20000, today: '2026-10-22', nowMinutes: 600 })
    expect(statusLine(c, opts, 'weekly')).toEqual({ tone: 'ok', text: 'Covered until Sat, Nov 14' })
  })

  it('warns the day before a payment is due', () => {
    const c = coverage({ ...W, paid: 0, today: '2026-10-23', nowMinutes: 600 })
    expect(statusLine(c, { ...opts, today: '2026-10-23' }, 'weekly')).toEqual({ tone: 'soon', text: '5,000 FCFA due tomorrow' })
  })

  it('says how many weeks late', () => {
    const c = coverage({ ...W, paid: 0, today: '2026-10-27', nowMinutes: 600 })
    expect(statusLine(c, { ...opts, today: '2026-10-27' }, 'weekly')).toEqual({ tone: 'late', text: '1 week late · 5,000 FCFA due' })
  })

  it('turn day wins over late', () => {
    const c = coverage({ ...W, paid: 0, today: '2026-10-27', nowMinutes: 600 })
    expect(statusLine(c, { ...opts, today: '2026-10-27', turnToday: true }, 'weekly')).toEqual({ tone: 'turn', text: 'Your turn today' })
  })
})

describe('validatePayout', () => {
  it('rejects moving more than the payout', () => {
    expect(validatePayout(50000, 60000)).toBe('You can move at most the payout amount.')
  })
  it('requires an amount', () => {
    expect(validatePayout(0, 0)).toBe('Enter the payout amount.')
  })
  it('accepts moving all of it', () => {
    expect(validatePayout(50000, 50000)).toBeNull()
  })
})
