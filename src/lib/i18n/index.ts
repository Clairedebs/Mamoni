import { en, type Messages } from './en'
import { fr } from './fr'

export type { Messages }

export const LANGS = ['en', 'fr'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = 'en'

/** Each language's own name, so it can always be found in the picker. */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', fr: 'Français' }

/** Remembers the chosen language; the proxy reads it to serve /en or /fr. */
export const LANG_COOKIE = 'mm-lang'

const MESSAGES: Record<Lang, Messages> = { en, fr }

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v)

export const messages = (lang: Lang): Messages => MESSAGES[lang]

/** Picks a language from the cookie, then the browser's Accept-Language, then English. */
export function resolveLang(cookie: string | undefined, acceptLanguage: string | null): Lang {
  if (isLang(cookie)) return cookie
  for (const part of (acceptLanguage ?? '').split(',')) {
    const code = part.trim().slice(0, 2).toLowerCase()
    if (isLang(code)) return code
  }
  return DEFAULT_LANG
}

/** Stored names of the default categories shown in the reader's language; renamed ones are left alone. */
export function localizeCategory<T extends { name: string; description: string | null; is_default: boolean }>(c: T, lang: Lang): T {
  if (!c.is_default) return c
  const names = MESSAGES[lang].defaultCategories
  return { ...c, name: names[c.name] ?? c.name, description: c.description && (names[c.description] ?? c.description) }
}
