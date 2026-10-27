'use client'

import { useSyncExternalStore } from 'react'
import { useLang } from './i18n'
import { greetingFor } from '@/lib/format'

/** Re-renders at the top of every hour and when the app comes back to the foreground. */
function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>
  const arm = () => {
    const now = new Date()
    const msToNextHour = 3600e3 - (now.getMinutes() * 60e3 + now.getSeconds() * 1e3 + now.getMilliseconds())
    timer = setTimeout(() => {
      onChange()
      arm()
    }, msToNextHour + 50)
  }
  const onVisible = () => document.visibilityState === 'visible' && onChange()
  arm()
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

/** Greeting from the device's local clock; `initial` is the server's guess from the profile time zone. */
export function Greeting({ initial }: { initial: string }) {
  const lang = useLang()
  return useSyncExternalStore(subscribe, () => greetingFor(new Date().getHours(), lang), () => initial)
}
