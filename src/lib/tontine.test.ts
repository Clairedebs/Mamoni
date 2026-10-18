import { describe, expect, it } from 'vitest'
import { coverage, deadlines, estimateCycleEnd, planTontineReminders, rebase, statusLine, validateGroupInput, validatePayout } from './tontine'
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

describe('validateGroupInput', () => {
  const ok = {
    name: 'Friday tontine',
    amountPerName: 2500,
    namesTotal: 20,
    namesHeld: 2,
    frequency: 'weekly' as const,
    deadlineTime: '18:00',
    cycleStart: '2026-09-05',
    cycleEnd: '2027-01-16',
    firstDue: '2026-10-24',
    turns: [
      { turnOn: '2026-12-05', beforeApp: false },
      { turnOn: '2026-09-12', beforeApp: true },
    ],
  }
  it('accepts a complete group', () => {
    expect(validateGroupInput(ok)).toBeNull()
  })
  it('needs a name', () => {
    expect(validateGroupInput({ ...ok, name: '  ' })).toBe('Give your group a name.')
  })
  it('needs one turn per name held', () => {
    expect(validateGroupInput({ ...ok, turns: ok.turns.slice(0, 1) })).toBe('Add one turn for each name you hold.')
  })
  it('cannot hold more names than the group has', () => {
    expect(validateGroupInput({ ...ok, namesTotal: 2, namesHeld: 3, turns: [...ok.turns, ok.turns[0]] })).toBe('You can’t hold more names than the group has.')
  })
  it('next due date must sit inside the cycle', () => {
    expect(validateGroupInput({ ...ok, firstDue: '2026-09-01' })).toBe('Your next due date must be within the cycle.')
  })
  it('turns must sit inside the cycle', () => {
    expect(validateGroupInput({ ...ok, turns: [ok.turns[0], { turnOn: '2027-02-01', beforeApp: false }] })).toBe('Each turn must fall within the cycle.')
  })
  it('cycle end cannot precede the start', () => {
    expect(validateGroupInput({ ...ok, cycleEnd: '2026-09-01' })).toBe('The cycle end must be after its start.')
  })
})

describe('planTontineReminders', () => {
  const base = {
    groupId: 'g1',
    name: 'Friday tontine',
    deadlineTime: '18:00',
    reminderMinutes: 20 * 60 + 30,
    lastDueFor: null as string | null,
    lastBehindFor: null as string | null,
    turns: [] as { id: string; turnOn: string; status: 'upcoming' | 'collected' | 'before_app'; notifiedOn: string | null; expectedAmount: number }[],
  }
  const cov = (paid: number, today: string, nowMinutes: number) => coverage({ ...W, paid, today, nowMinutes })

  it('reminds the evening before an unpaid deadline', () => {
    const r = planTontineReminders({ ...base, coverage: cov(0, '2026-10-23', 1240), today: '2026-10-23', nowMinutes: 1240 })
    expect(r.pushes).toEqual([{ title: 'Friday tontine: payment due tomorrow', body: '5,000 FCFA before 18:00.', url: '/tontines/g1', tag: 'tontine-due-g1-2026-10-24' }])
    expect(r.dueFor).toBe('2026-10-24')
  })

  it('stays quiet while paid ahead', () => {
    const r = planTontineReminders({ ...base, coverage: cov(20000, '2026-10-23', 1240), today: '2026-10-23', nowMinutes: 1240 })
    expect(r.pushes).toEqual([])
  })

  it('does not repeat a due reminder already sent', () => {
    const r = planTontineReminders({ ...base, lastDueFor: '2026-10-24', coverage: cov(0, '2026-10-23', 1250), today: '2026-10-23', nowMinutes: 1250 })
    expect(r.pushes).toEqual([])
  })

  it('waits for the reminder time', () => {
    const r = planTontineReminders({ ...base, coverage: cov(0, '2026-10-23', 600), today: '2026-10-23', nowMinutes: 600 })
    expect(r.pushes).toEqual([])
  })

  it('sends one behind reminder the morning after a missed deadline', () => {
    const r = planTontineReminders({ ...base, coverage: cov(0, '2026-10-25', 540), today: '2026-10-25', nowMinutes: 540 })
    expect(r.pushes[0].title).toBe('Friday tontine: payment missed')
    expect(r.pushes[0].body).toBe('5,000 FCFA is due.')
    expect(r.behindFor).toBe('2026-10-24')
    const again = planTontineReminders({ ...base, lastBehindFor: '2026-10-24', coverage: cov(0, '2026-10-25', 600), today: '2026-10-25', nowMinutes: 600 })
    expect(again.pushes).toEqual([])
  })

  it('announces the turn on its morning once', () => {
    const turns = [{ id: 't1', turnOn: '2026-12-05', status: 'upcoming' as const, notifiedOn: null, expectedAmount: 50000 }]
    const r = planTontineReminders({ ...base, turns, coverage: cov(100000, '2026-12-05', 500), today: '2026-12-05', nowMinutes: 500 })
    expect(r.pushes).toEqual([{ title: 'It’s your turn: 50,000 FCFA from Friday tontine', body: 'Tap to record it and choose how much to save.', url: '/tontines/g1', tag: 'tontine-turn-t1' }])
    expect(r.notifiedTurns).toEqual(['t1'])
  })
})
