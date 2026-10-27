'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { PushToggle } from './PushToggle'
import { CurrencyPicker } from './CurrencyPicker'
import { TimeZonePicker } from './TimeZonePicker'
import { useToast } from './Toast'
import { useLang, useT } from './i18n'
import { applyTheme, readTheme, type ThemeChoice } from './theme'
import { useClientValue } from './useClientValue'
import { changeLanguage, signOut, updateSettings } from '@/lib/actions'
import { LANGS, LANG_NAMES, type Lang } from '@/lib/i18n'
import type { Profile, ReminderFrequency } from '@/lib/types'

type Props = { profile: Profile; counts: { expense: number; income: number; saving: number }; email: string | null }

const FREQ: ReminderFrequency[] = ['daily', 'thrice_weekly', 'weekly']

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
}

export function SettingsForm({ profile, counts, email }: Props) {
  const toast = useToast()
  const { openTime } = usePickers()
  const [, start] = useTransition()
  const [p, setP] = useState(profile)
  const theme = useClientValue<ThemeChoice>(readTheme, 'system', subscribeTheme)
  const [name, setName] = useState(profile.display_name ?? '')
  const lang = useLang()
  const m = useT()
  const s = m.settings

  const patch = (u: Partial<Profile>) => {
    setP((cur) => ({ ...cur, ...u }))
    start(async () => {
      const res = await updateSettings(u as Parameters<typeof updateSettings>[0])
      if (!res.ok) {
        toast(res.error)
        setP(profile)
      }
    })
  }
  const themeIdx = ['system', 'light', 'dark'].indexOf(theme)

  return (
    <div className="set-wrap">
      <div className="section-h" style={{ marginTop: 4 }}>
        <h2>{s.reminders}</h2>
      </div>
      <div className="set-group">
        <PushToggle />
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="bell-ring" />
          </span>
          <div className="mid">
            <b>{s.updateReminder}</b>
            <small>{s.updateReminderHint}</small>
          </div>
          <Switch on={p.reminder_enabled} label={s.updateReminder} onChange={(v) => patch({ reminder_enabled: v })} />
        </div>
        {p.reminder_enabled && (
          <>
            <div className="chips" role="group" aria-label={s.frequency}>
              {FREQ.map((k) => (
                <button key={k} className="chipsel" aria-pressed={p.reminder_frequency === k} onClick={() => patch({ reminder_frequency: k })}>
                  {s.frequencies[k]}
                </button>
              ))}
            </div>
            <div className="set-row">
              <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                <Icon name="clock-3" />
              </span>
              <div className="mid">
                <b>{s.reminderTime}</b>
              </div>
              <button
                className="time"
                aria-haspopup="dialog"
                aria-label={s.reminderTimeAria(p.reminder_time)}
                onClick={(e) => openTime({ anchor: e.currentTarget, value: p.reminder_time, title: s.reminderTime, onPick: (v) => patch({ reminder_time: v }) })}
              >
                <Icon name="clock-3" />
                <span className="num">{p.reminder_time}</span>
              </button>
            </div>
          </>
        )}
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="calendar-clock" />
          </span>
          <div className="mid">
            <b>{s.nudge}</b>
            <small>{s.nudgeHint}</small>
          </div>
          <Switch on={p.nudge_enabled} label={s.nudge} onChange={(v) => patch({ nudge_enabled: v })} />
        </div>
      </div>

      <div className="section-h">
        <h2>{s.preferences}</h2>
      </div>
      <div className="set-group">
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="pencil" />
          </span>
          <div className="mid">
            <b>{s.yourName}</b>
          </div>
          <input
            className="time"
            style={{ width: 150, textAlign: 'right', fontSize: 16 }}
            value={name}
            maxLength={40}
            placeholder={s.addName}
            aria-label={s.yourName}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== (p.display_name ?? '') && patch({ display_name: name })}
          />
        </div>
        <LanguageRow value={lang} />
        <CurrencyPicker value={profile.currency} />
        <TimeZonePicker
          value={p.timezone}
          onPick={(tz) => {
            patch({ timezone: tz })
            toast(s.timeZoneUpdated)
          }}
        />
        <div className="set-row" style={{ flexWrap: 'wrap' }}>
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="sun-moon" />
          </span>
          <div className="mid">
            <b>{s.appearance}</b>
          </div>
          <div className="seg" id="theme-seg" style={{ margin: 0, width: 220 }} role="group" aria-label={s.appearance}>
            <span className="thumb" style={{ width: 'calc((100% - 6px)/3)', transform: `translateX(${themeIdx * 100}%)` }} />
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                aria-pressed={theme === t}
                onClick={() => applyTheme(t)}
              >
                {s.themes[t]}
              </button>
            ))}
          </div>
        </div>
        <Link className="set-row" href="/savings/setup">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="piggy-bank" />
          </span>
          <div className="mid">
            <b>{m.savings.balances}</b>
          </div>
          <span className="val">
            <Icon name="chevron-right" />
          </span>
        </Link>
        <Link className="set-row" href="/settings/categories">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="tags" />
          </span>
          <div className="mid">
            <b>{m.meta.categories}</b>
            <small>{s.categoryCounts(counts.expense, counts.income, counts.saving)}</small>
          </div>
          <span className="val">
            <Icon name="chevron-right" />
          </span>
        </Link>
      </div>

      <div className="section-h">
        <h2>{s.device}</h2>
      </div>
      <div className="set-group">
        <InstallRow />
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="cloud-off" />
          </span>
          <div className="mid">
            <b>
              {s.offline}
              <span className="soon">{s.soon}</span>
            </b>
            <small>{s.offlineHint}</small>
          </div>
        </div>
      </div>

      <div className="section-h">
        <h2>{s.help}</h2>
      </div>
      <div className="set-group">
        <Link className="set-row" href="/welcome?replay=1">
          <span className="tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
            <Icon name="sparkles" />
          </span>
          <div className="mid">
            <b>{s.replay}</b>
            <small>{s.replayHint}</small>
          </div>
          <span className="val">
            <Icon name="chevron-right" />
          </span>
        </Link>
      </div>

      <div className="section-h">
        <h2>{s.account}</h2>
      </div>
      <div className="set-group">
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="users" />
          </span>
          <div className="mid">
            <b>{s.signedIn}</b>
            <small>{email ?? ''}</small>
          </div>
          <form action={signOut}>
            <button className="btn-sm" style={{ background: 'var(--surface-2)' }}>
              <Icon name="log-out" size={15} />
              {s.signOut}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

/** Two-way switch; the whole app reloads in the new language. */
function LanguageRow({ value }: { value: Lang }) {
  const toast = useToast()
  const s = useT().settings
  const [pending, start] = useTransition()
  const [picked, setPicked] = useState(value)
  const idx = LANGS.indexOf(picked)

  const pick = (l: Lang) => {
    if (l === picked || pending) return
    setPicked(l)
    start(async () => {
      const res = await changeLanguage(l)
      if (!res.ok) {
        setPicked(value)
        return toast(res.error)
      }
      window.location.reload()
    })
  }

  return (
    <div className="set-row" style={{ flexWrap: 'wrap' }}>
      <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
        <Icon name={pending ? 'loader' : 'languages'} />
      </span>
      <div className="mid">
        <b>{s.language}</b>
      </div>
      <div className="seg" style={{ margin: 0, width: 220 }} role="group" aria-label={s.language}>
        <span className="thumb" style={{ width: `calc((100% - 6px)/${LANGS.length})`, transform: `translateX(${idx * 100}%)` }} />
        {LANGS.map((l) => (
          <button key={l} lang={l} aria-pressed={picked === l} disabled={pending} onClick={() => pick(l)}>
            {LANG_NAMES[l]}
          </button>
        ))}
      </div>
    </div>
  )
}

function subscribeTheme(cb: () => void) {
  window.addEventListener('mm-theme', cb)
  return () => window.removeEventListener('mm-theme', cb)
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

function InstallRow() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [justInstalled, setJustInstalled] = useState(false)
  const standalone = useClientValue(() => matchMedia('(display-mode: standalone)').matches, false)
  const ios = useClientValue(() => /iPad|iPhone|iPod/.test(navigator.userAgent), false)
  const installed = standalone || justInstalled
  const s = useT().settings
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvt(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', on)
    window.addEventListener('appinstalled', () => setJustInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])

  return (
    <div className="set-row">
      <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
        <Icon name="smartphone" />
      </span>
      <div className="mid">
        <b>{s.addToHome}</b>
        <small>{installed ? s.installed : ios ? s.iosInstall : s.nativeApp}</small>
      </div>
      {evt && !installed && (
        <button
          className="btn-sm"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}
          onClick={async () => {
            await evt.prompt()
            setEvt(null)
          }}
        >
          {s.install}
        </button>
      )}
    </div>
  )
}
