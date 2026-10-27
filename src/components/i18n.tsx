'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_LANG, messages, type Lang } from '@/lib/i18n'

const Ctx = createContext<Lang>(DEFAULT_LANG)

/** Set once in the root layout from the /en or /fr segment. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>
}

export const useLang = () => useContext(Ctx)
export const useT = () => messages(useContext(Ctx))
