'use client'

import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { useT } from './i18n'
import { applyTheme, isDarkNow } from './theme'

/** Sun/moon button: flips between light and dark. */
export function ThemeToggle({ variant }: { variant: 'icon' | 'nav' }) {
  const [dark, setDark] = useState<boolean | null>(null)
  const m = useT()

  useEffect(() => {
    const sync = () => setDark(isDarkNow())
    sync()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', sync)
    window.addEventListener('mm-theme', sync)
    return () => {
      mq.removeEventListener('change', sync)
      window.removeEventListener('mm-theme', sync)
    }
  }, [])

  const label = dark ? m.theme.toLight : m.theme.toDark
  const onClick = () => applyTheme(isDarkNow() ? 'light' : 'dark')

  if (variant === 'nav')
    return (
      <button className="nav" onClick={onClick} aria-label={label}>
        <Icon name={dark ? 'sun' : 'moon'} />
        <span>{dark ? m.theme.light : m.theme.dark}</span>
      </button>
    )
  return (
    <button className="icon-btn" onClick={onClick} aria-label={label}>
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )
}
