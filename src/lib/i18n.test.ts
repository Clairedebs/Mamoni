import { describe, expect, it } from 'vitest'
import { localizeCategory, messages, resolveLang } from './i18n'
import { en } from './i18n/en'
import { fr } from './i18n/fr'
import { dayLabel, monthLabel, shortDate, sinceLabel } from './format'
import { categoryDeleteBlock, coverage, planTontineReminders, statusLine, validatePayout } from './tontine'
import { validateTxEdit } from './tx'
import { zoneLabel } from './timezones'
import { CURRENCIES, currencyName, searchCurrencies } from './currencies'

/** Every key path in a dictionary, with arrays counted by length. */
function shape(o: unknown, path = ''): string[] {
  if (Array.isArray(o)) return [`${path}[${o.length}]`, ...o.flatMap((v, i) => shape(v, `${path}[${i}]`))]
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
  return [`${path}:${typeof o}`]
}

describe('dictionaries', () => {
  it('French has every English key, of the same kind', () => {
    const enShape = shape({ ...en, defaultCategories: {} })
    const frShape = shape({ ...fr, defaultCategories: {} })
    expect(frShape).toEqual(enShape)
  })
  it('translates every default category name', () => {
    for (const name of ['Groceries', 'Eating out', 'Family & gifts', 'Contributions', 'Tontine payout']) expect(fr.defaultCategories[name]).toBeTruthy()
  })
})

describe('resolveLang', () => {
  it('prefers the saved choice', () => {
    expect(resolveLang('fr', 'en-US,en;q=0.9')).toBe('fr')
    expect(resolveLang('en', 'fr-FR')).toBe('en')
  })
  it('falls back to the browser, then English', () => {
    expect(resolveLang(undefined, 'fr-CM,fr;q=0.9,en;q=0.8')).toBe('fr')
    expect(resolveLang('de', 'de-DE,de;q=0.9')).toBe('en')
    expect(resolveLang(undefined, null)).toBe('en')
  })
})

describe('French dates', () => {
  it('formats short and month labels', () => {
    expect(shortDate('2026-10-27', 'fr')).toBe('mar. 27 oct.')
    expect(shortDate('2026-11-01', 'fr')).toBe('dim. 1er nov.')
    expect(monthLabel('2026-10-01', 'fr')).toBe('Octobre 2026')
    expect(sinceLabel('2026-02-10', 'fr')).toBe('févr. 2026')
  })
  it('says today and yesterday', () => {
    expect(dayLabel('2026-10-27', '2026-10-27', 'fr')).toBe('Aujourd’hui')
    expect(dayLabel('2026-10-26', '2026-10-27', 'fr')).toBe('Hier')
  })
  it('keeps English as before', () => {
    expect(shortDate('2026-10-27', 'en')).toBe('Tue, Oct 27')
    expect(monthLabel('2026-10-01', 'en')).toBe('October 2026')
  })
})

describe('French tontine text', () => {
  const W = { firstDue: '2026-10-24', cycleEnd: '2027-01-16', frequency: 'weekly' as const, perPeriod: 5000, openingCredit: 0, deadlineMinutes: 1080 }
  const label = (iso: string) => shortDate(iso, 'fr')

  it('status lines', () => {
    const ahead = coverage({ ...W, paid: 20000, today: '2026-10-22', nowMinutes: 600 })
    expect(statusLine(ahead, { today: '2026-10-22', turnToday: false, label }, 'weekly', 'fr').text).toBe('Payé jusqu’au sam. 14 nov.')
    const late = coverage({ ...W, paid: 0, today: '2026-10-27', nowMinutes: 600 })
    expect(statusLine(late, { today: '2026-10-27', turnToday: false, label }, 'weekly', 'fr').text).toBe('1 semaine de retard · 5,000 FCFA à payer')
    expect(statusLine(late, { today: '2026-10-27', turnToday: true, label }, 'weekly', 'fr').text).toBe('Votre tour aujourd’hui')
  })

  it('reminders', () => {
    const r = planTontineReminders({
      groupId: 'g1',
      name: 'Tontine du vendredi',
      coverage: coverage({ ...W, paid: 0, today: '2026-10-23', nowMinutes: 1240 }),
      deadlineTime: '18:00',
      today: '2026-10-23',
      nowMinutes: 1240,
      reminderMinutes: 20 * 60 + 30,
      lastDueFor: null,
      lastBehindFor: null,
      turns: [],
      lang: 'fr',
    })
    expect(r.pushes[0]).toMatchObject({ title: 'Tontine du vendredi : paiement à faire demain', body: '5,000 FCFA avant 18:00.' })
  })

  it('validation and delete messages', () => {
    expect(validatePayout(0, 0, 'fr')).toBe('Saisissez le montant encaissé.')
    expect(validateTxEdit({ amount: 100, occurredOn: '2026-10-28', today: '2026-10-27' }, 'fr')).toBe('La date ne peut pas être dans le futur.')
    expect(categoryDeleteBlock({ role: null, usage: 3, isLast: false, kind: 'saving' }, 'fr')).toBe('Utilisée par 3 pots. Déplacez-les ou supprimez-les d’abord.')
  })
})

describe('localized names', () => {
  it('translates untouched default categories only', () => {
    const base = { description: null, is_default: true }
    expect(localizeCategory({ ...base, name: 'Groceries' }, 'fr').name).toBe('Courses')
    expect(localizeCategory({ ...base, name: 'Groceries' }, 'en').name).toBe('Groceries')
    expect(localizeCategory({ ...base, name: 'Marché' }, 'fr').name).toBe('Marché')
    expect(localizeCategory({ ...base, name: 'Bank', is_default: false }, 'fr').name).toBe('Bank')
    expect(localizeCategory({ name: 'Bank', description: 'Bank accounts and deposits', is_default: true }, 'fr').description).toBe('Comptes bancaires et dépôts')
  })
  it('time zones and currencies', () => {
    expect(zoneLabel('Africa/Douala', 'fr')).toBe('Douala, Cameroun')
    expect(zoneLabel('Africa/Douala', 'en')).toBe('Douala, Cameroon')
    expect(currencyName(CURRENCIES[0], 'fr')).toBe('Franc CFA d’Afrique de l’Ouest')
    expect(searchCurrencies(CURRENCIES, 'livre').map((c) => c.code)).toEqual(['GBP'])
  })
  it('messages() returns the matching dictionary', () => {
    expect(messages('fr').nav.settings).toBe('Réglages')
    expect(messages('en').nav.settings).toBe('Settings')
  })
})
