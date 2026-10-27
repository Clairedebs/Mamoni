import 'server-only'
import { cookies, headers } from 'next/headers'
import { lang } from 'next/root-params'
import { DEFAULT_LANG, LANG_COOKIE, isLang, messages, resolveLang, type Lang } from '.'

/** The language of the page being rendered (the /en or /fr root segment). Server Components only. */
export async function getLang(): Promise<Lang> {
  const l = await lang()
  return isLang(l) ? l : DEFAULT_LANG
}

export async function getT() {
  return messages(await getLang())
}

/**
 * The language from the request itself, decided the same way the proxy does. For Server Actions and the
 * data layer, which root params don't reach (actions) or which actions also call (data).
 */
export async function requestLang(): Promise<Lang> {
  const [c, h] = await Promise.all([cookies(), headers()])
  return resolveLang(c.get(LANG_COOKIE)?.value, h.get('accept-language'))
}

export async function requestT() {
  return messages(await requestLang())
}
