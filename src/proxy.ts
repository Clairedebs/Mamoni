import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/env'
import { LANG_COOKIE, LANGS, resolveLang } from '@/lib/i18n'

const PUBLIC = ['/login', '/auth', '/setup']
/** Paths served outside the /[lang] tree: route handlers and files. */
const UNLOCALIZED = /^\/(api|auth)(\/|$)|\.[a-z0-9]+$/i

/**
 * Serves every page from /en or /fr (chosen by the language cookie, else the browser) while the URL stays
 * unprefixed, refreshes the Supabase session cookie and sends signed-out visitors to /login.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // A /fr/... link switches the language and drops the prefix.
  const prefixed = LANGS.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
  if (prefixed) {
    const res = NextResponse.redirect(new URL(`${pathname.slice(prefixed.length + 1) || '/'}${search}`, request.url))
    res.cookies.set(LANG_COOKIE, prefixed, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    return res
  }

  const lang = resolveLang(request.cookies.get(LANG_COOKIE)?.value, request.headers.get('accept-language'))
  const target = UNLOCALIZED.test(pathname) ? null : new URL(`/${lang}${pathname === '/' ? '' : pathname}${search}`, request.url)
  const pass = () => (target ? NextResponse.rewrite(target, { request }) : NextResponse.next({ request }))
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!isSupabaseConfigured) {
    return isPublic ? pass() : NextResponse.redirect(new URL('/setup', request.url))
  }

  let response = pass()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = pass()
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)

  if (!signedIn && !isPublic) {
    const url = new URL('/login', request.url)
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  if (signedIn && pathname === '/login') return NextResponse.redirect(new URL('/', request.url))
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/cron|sw.js|manifest.webmanifest|icons/|favicon.ico|.*\\.(?:png|svg|jpg|webp|ico)$).*)'],
}
