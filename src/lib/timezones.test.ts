import { describe, expect, it } from 'vitest'
import { cityOf, offsetLabel, searchTimeZones } from './timezones'

const ZONES = ['Africa/Abidjan', 'Africa/Douala', 'Africa/Lagos', 'America/New_York', 'Europe/Paris', 'Asia/Tokyo']

describe('cityOf', () => {
  it('turns the last part into a readable city', () => {
    expect(cityOf('America/New_York')).toBe('New York')
    expect(cityOf('Africa/Douala')).toBe('Douala')
  })
})

describe('offsetLabel', () => {
  it('shows UTC+1 for West Africa', () => {
    expect(offsetLabel('Africa/Douala', new Date('2026-10-23T12:00:00Z'))).toBe('UTC+1')
  })
  it('shows plain UTC for zero offset', () => {
    expect(offsetLabel('Africa/Abidjan', new Date('2026-10-23T12:00:00Z'))).toBe('UTC')
  })
  it('keeps half-hour offsets', () => {
    expect(offsetLabel('Asia/Kolkata', new Date('2026-10-23T12:00:00Z'))).toBe('UTC+5:30')
  })
})

describe('searchTimeZones', () => {
  it('returns everything for an empty query', () => {
    expect(searchTimeZones(ZONES, '  ')).toEqual(ZONES)
  })
  it('finds a zone by city, ignoring case and accents', () => {
    expect(searchTimeZones(ZONES, 'douala')).toEqual(['Africa/Douala'])
    expect(searchTimeZones(ZONES, 'new york')).toEqual(['America/New_York'])
  })
  it('finds a zone by country name', () => {
    expect(searchTimeZones(ZONES, 'Cameroon')).toEqual(['Africa/Douala'])
    expect(searchTimeZones(ZONES, "Côte d'Ivoire")).toEqual(['Africa/Abidjan'])
    expect(searchTimeZones(ZONES, 'cameroun')).toEqual(['Africa/Douala'])
  })
  it('finds zones by region', () => {
    expect(searchTimeZones(ZONES, 'europe')).toEqual(['Europe/Paris'])
  })
})
