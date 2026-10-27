import type { Lang } from './i18n'

/** Country names (English and French) for the zones most users of the app pick. */
const COUNTRIES: Record<string, string[]> = {
  'Africa/Douala': ['Cameroon', 'Cameroun'],
  'Africa/Abidjan': ["Côte d'Ivoire", 'Ivory Coast'],
  'Africa/Dakar': ['Senegal', 'Sénégal'],
  'Africa/Bamako': ['Mali'],
  'Africa/Ouagadougou': ['Burkina Faso'],
  'Africa/Lome': ['Togo'],
  'Africa/Porto-Novo': ['Benin', 'Bénin'],
  'Africa/Niamey': ['Niger'],
  'Africa/Libreville': ['Gabon'],
  'Africa/Brazzaville': ['Congo', 'Republic of the Congo'],
  'Africa/Kinshasa': ['DR Congo', 'RDC', 'Democratic Republic of the Congo'],
  'Africa/Lubumbashi': ['DR Congo', 'RDC'],
  'Africa/Ndjamena': ['Chad', 'Tchad'],
  'Africa/Bangui': ['Central African Republic', 'Centrafrique'],
  'Africa/Malabo': ['Equatorial Guinea', 'Guinée équatoriale'],
  'Africa/Conakry': ['Guinea', 'Guinée'],
  'Africa/Lagos': ['Nigeria'],
  'Africa/Accra': ['Ghana'],
  'Africa/Casablanca': ['Morocco', 'Maroc'],
  'Africa/Algiers': ['Algeria', 'Algérie'],
  'Africa/Tunis': ['Tunisia', 'Tunisie'],
  'Indian/Antananarivo': ['Madagascar'],
  'Europe/Paris': ['France'],
  'Europe/Brussels': ['Belgium', 'Belgique'],
  'Europe/Zurich': ['Switzerland', 'Suisse'],
  'Europe/Berlin': ['Germany', 'Allemagne'],
  'Europe/London': ['United Kingdom', 'UK', 'Royaume-Uni', 'England'],
  'Europe/Madrid': ['Spain', 'Espagne'],
  'Europe/Rome': ['Italy', 'Italie'],
  'America/Toronto': ['Canada'],
  'America/New_York': ['United States', 'USA', 'États-Unis'],
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .toLowerCase()
    .trim()

/** French display names where they differ from the first (English) entry above. */
const FR_COUNTRY: Record<string, string> = {
  'Africa/Douala': 'Cameroun',
  'Africa/Dakar': 'Sénégal',
  'Africa/Porto-Novo': 'Bénin',
  'Africa/Kinshasa': 'RD Congo',
  'Africa/Lubumbashi': 'RD Congo',
  'Africa/Ndjamena': 'Tchad',
  'Africa/Bangui': 'Centrafrique',
  'Africa/Malabo': 'Guinée équatoriale',
  'Africa/Conakry': 'Guinée',
  'Africa/Casablanca': 'Maroc',
  'Africa/Algiers': 'Algérie',
  'Africa/Tunis': 'Tunisie',
  'Europe/Brussels': 'Belgique',
  'Europe/Zurich': 'Suisse',
  'Europe/Berlin': 'Allemagne',
  'Europe/London': 'Royaume-Uni',
  'Europe/Madrid': 'Espagne',
  'Europe/Rome': 'Italie',
  'America/New_York': 'États-Unis',
}

export const cityOf = (tz: string) => (tz.split('/').pop() ?? tz).replace(/_/g, ' ')

export function countriesOf(tz: string) {
  return COUNTRIES[tz] ?? []
}

/** "Douala, Cameroon" / "Douala, Cameroun", or just the city when the country isn't known. */
export function zoneLabel(tz: string, lang: Lang) {
  const country = (lang === 'fr' && FR_COUNTRY[tz]) || countriesOf(tz)[0]
  return country ? `${cityOf(tz)}, ${country}` : cityOf(tz)
}

/** "UTC+1", "UTC-5", "UTC+5:30", or "UTC" for zero, at the given instant. */
export function offsetLabel(tz: string, at: Date = new Date()) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const off = name.replace(/^GMT/, '')
  return off ? `UTC${off}` : 'UTC'
}

export function allTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return Object.keys(COUNTRIES)
  }
}

/** Matches city, region or country (English or French), ignoring case and accents. */
export function searchTimeZones(zones: string[], query: string): string[] {
  const q = fold(query)
  if (!q) return zones
  return zones.filter((tz) => {
    const hay = [tz.replace(/_/g, ' '), cityOf(tz), ...countriesOf(tz)].map(fold)
    return hay.some((h) => h.includes(q))
  })
}
