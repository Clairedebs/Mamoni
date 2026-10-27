import type { Lang } from './i18n'

export type Currency = { code: string; name: string; fr: string; symbol: string; decimals: 0 | 2 }

/** Currencies offered in the app. The symbol is shown after the number, like "12,500 FCFA". */
export const CURRENCIES: Currency[] = [
  { code: 'XOF', name: 'West African CFA franc', fr: 'Franc CFA d’Afrique de l’Ouest', symbol: 'FCFA', decimals: 0 },
  { code: 'XAF', name: 'Central African CFA franc', fr: 'Franc CFA d’Afrique centrale', symbol: 'FCFA', decimals: 0 },
  { code: 'NGN', name: 'Nigerian naira', fr: 'Naira nigérian', symbol: '₦', decimals: 2 },
  { code: 'GHS', name: 'Ghanaian cedi', fr: 'Cedi ghanéen', symbol: 'GH₵', decimals: 2 },
  { code: 'GNF', name: 'Guinean franc', fr: 'Franc guinéen', symbol: 'FG', decimals: 0 },
  { code: 'CDF', name: 'Congolese franc', fr: 'Franc congolais', symbol: 'FC', decimals: 2 },
  { code: 'MAD', name: 'Moroccan dirham', fr: 'Dirham marocain', symbol: 'DH', decimals: 2 },
  { code: 'DZD', name: 'Algerian dinar', fr: 'Dinar algérien', symbol: 'DA', decimals: 2 },
  { code: 'TND', name: 'Tunisian dinar', fr: 'Dinar tunisien', symbol: 'DT', decimals: 2 },
  { code: 'EUR', name: 'Euro', fr: 'Euro', symbol: '€', decimals: 2 },
  { code: 'USD', name: 'US dollar', fr: 'Dollar américain', symbol: '$', decimals: 2 },
  { code: 'GBP', name: 'British pound', fr: 'Livre sterling', symbol: '£', decimals: 2 },
  { code: 'CAD', name: 'Canadian dollar', fr: 'Dollar canadien', symbol: 'CA$', decimals: 2 },
  { code: 'CHF', name: 'Swiss franc', fr: 'Franc suisse', symbol: 'CHF', decimals: 2 },
]

export const currencyName = (c: Currency, lang: Lang) => (lang === 'fr' ? c.fr : c.name)

export const DEFAULT_CURRENCY = 'XOF'

export function currencyOf(code: string | null | undefined): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

export function searchCurrencies(list: Currency[], query: string): Currency[] {
  const q = fold(query)
  if (!q) return list
  return list.filter((c) => [c.code, c.name, c.fr, c.symbol].some((s) => fold(s).includes(q)))
}

/** Rounds to whole cents, so sums like 0.1 + 0.2 stay exact enough to compare. */
export const roundMoney = (n: number) => Math.round(n * 100) / 100

/** A positive amount with at most 2 decimals, below 10 billion. */
export const isMoney = (n: number) => Number.isFinite(n) && n > 0 && n < 1e10 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6

export const CURRENCY_KEY = 'mm-currency'

/** Runs before first paint: sets the symbol every `.cur` label shows (cached from the last visit). */
export const CURRENCY_SCRIPT = `try{var s=localStorage.getItem('${CURRENCY_KEY}-symbol');if(s)document.documentElement.style.setProperty('--cur',JSON.stringify(s))}catch(e){}`
