'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Icon } from './Icon'
import { usePickers } from './Pickers'
import { PushToggle } from './PushToggle'
import { useToast } from './Toast'
import { applyTheme, readTheme, type ThemeChoice } from './theme'
import { useClientValue } from './useClientValue'
import { signOut, updatePotSchedule, updateSettings } from '@/lib/actions'
import { dueIn, shortDate, tint } from '@/lib/format'
import type { Pot, Profile, ReminderFrequency, Repeat } from '@/lib/types'

type Props = { profile: Profile; contributionPots: Pot[]; counts: { expense: number; income: number; saving: number }; today: string; email: string | null }

const FREQ: [ReminderFrequency, string][] = [
  ['daily', 'Every day'],
  ['thrice_weekly', '3 times a week'],
  ['weekly', 'Every Sunday'],
]
const LEAD = ['On the day', '1 day before', '2 days before']

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
}

export function SettingsForm({ profile, contributionPots, counts, today, email }: Props) {
  const toast = useToast()
  const { openDate, openTime } = usePickers()
  const [, start] = useTransition()
  const [p, setP] = useState(profile)
  const [pots, setPots] = useState(contributionPots)
  const theme = useClientValue<ThemeChoice>(readTheme, 'system', subscribeTheme)
  const [name, setName] = useState(profile.display_name ?? '')
  const deviceTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : profile.timezone

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
  const schedule = (id: string, u: { due_date?: string; repeat?: Repeat }) => {
    setPots((cur) => cur.map((x) => (x.id === id ? { ...x, ...u } : x)))
    start(async () => {
      const res = await updatePotSchedule(id, u)
      if (!res.ok) toast(res.error)
    })
  }
  const themeIdx = ['system', 'light', 'dark'].indexOf(theme)

  return (
    <div className="set-wrap">
      <div className="section-h" style={{ marginTop: 4 }}>
        <h2>Reminders</h2>
      </div>
      <div className="set-group">
        <PushToggle />
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="bell-ring" />
          </span>
          <div className="mid">
            <b>Update reminder</b>
            <small>A notification so you remember to log your transactions</small>
          </div>
          <Switch on={p.reminder_enabled} label="Update reminder" onChange={(v) => patch({ reminder_enabled: v })} />
        </div>
        {p.reminder_enabled && (
          <>
            <div className="chips" role="group" aria-label="Frequency">
              {FREQ.map(([k, l]) => (
                <button key={k} className="chipsel" aria-pressed={p.reminder_frequency === k} onClick={() => patch({ reminder_frequency: k })}>
                  {l}
                </button>
              ))}
            </div>
            <div className="set-row">
              <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                <Icon name="clock-3" />
              </span>
              <div className="mid">
                <b>Reminder time</b>
              </div>
              <button
                className="time"
                aria-haspopup="dialog"
                aria-label={`Reminder time, ${p.reminder_time}`}
                onClick={(e) => openTime({ anchor: e.currentTarget, value: p.reminder_time, title: 'Reminder time', onPick: (v) => patch({ reminder_time: v }) })}
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
            <b>Nudge when nothing is logged</b>
            <small>After 2 days with no transactions</small>
          </div>
          <Switch on={p.nudge_enabled} label="Nudge when nothing is logged" onChange={(v) => patch({ nudge_enabled: v })} />
        </div>
        <div className="set-row">
          <span className="tile" style={tint('amber')}>
            <Icon name="hand-coins" />
          </span>
          <div className="mid">
            <b>Contribution day</b>
            <small>Get reminded before each tontine is due</small>
          </div>
          <Switch on={p.contribution_enabled} label="Contribution day" onChange={(v) => patch({ contribution_enabled: v })} />
        </div>
        {p.contribution_enabled && (
          <div className="sub-opts">
            {pots.length === 0 && (
              <p className="hint" style={{ padding: '12px 0' }}>
                No pots with a due date yet. Turn on “Remind me when it’s due” when you <Link className="link" href="/savings/pots/new">create a pot</Link>.
              </p>
            )}
            {pots.map((x) => {
              const due = x.due_date ?? today
              return (
                <div key={x.id} className="sub-row">
                  <div className="mid">
                    <b>{x.name}</b>
                    <small>{x.due_date ? dueIn(due, today) : 'No due date yet'}</small>
                  </div>
                  <button
                    className="time"
                    aria-haspopup="dialog"
                    aria-label={`Next due date for ${x.name}, ${shortDate(due)}`}
                    onClick={(e) => openDate({ anchor: e.currentTarget, value: due < today ? today : due, today, min: today, title: `${x.name} · next due`, onPick: (v) => schedule(x.id, { due_date: v }) })}
                  >
                    <Icon name="calendar" />
                    {shortDate(due)}
                  </button>
                  <div className="mini-chips" role="group" aria-label="Repeats">
                    {(['weekly', 'monthly', 'once'] as const).map((r) => (
                      <button key={r} className="chipsel" aria-pressed={x.repeat === r} onClick={() => schedule(x.id, { repeat: r })}>
                        {r[0].toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="sub-lbl">Remind me</div>
            <div className="chips" role="group" aria-label="Remind me">
              {LEAD.map((l, i) => (
                <button key={l} className="chipsel" aria-pressed={p.contribution_lead_days === i} onClick={() => patch({ contribution_lead_days: i })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="section-h">
        <h2>Preferences</h2>
      </div>
      <div className="set-group">
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="pencil" />
          </span>
          <div className="mid">
            <b>Your name</b>
          </div>
          <input
            className="time"
            style={{ width: 150, textAlign: 'right', fontSize: 16 }}
            value={name}
            maxLength={40}
            placeholder="Add your name"
            aria-label="Your name"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== (p.display_name ?? '') && patch({ display_name: name })}
          />
        </div>
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="coins" />
          </span>
          <div className="mid">
            <b>Currency</b>
          </div>
          <span className="val">CFA franc (FCFA)</span>
        </div>
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="clock-3" />
          </span>
          <div className="mid">
            <b>Time zone</b>
            <small>{p.timezone.replace(/_/g, ' ')}</small>
          </div>
          {deviceTz && deviceTz !== p.timezone && (
            <button className="btn-sm" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }} onClick={() => patch({ timezone: deviceTz })}>
              Use {deviceTz.split('/').pop()?.replace(/_/g, ' ')}
            </button>
          )}
        </div>
        <div className="set-row" style={{ flexWrap: 'wrap' }}>
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="sun-moon" />
          </span>
          <div className="mid">
            <b>Appearance</b>
          </div>
          <div className="seg" id="theme-seg" style={{ margin: 0, width: 220 }} role="group" aria-label="Appearance">
            <span className="thumb" style={{ width: 'calc((100% - 6px)/3)', transform: `translateX(${themeIdx * 100}%)` }} />
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                aria-pressed={theme === t}
                onClick={() => applyTheme(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Link className="set-row" href="/savings/setup">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="piggy-bank" />
          </span>
          <div className="mid">
            <b>Starting balances</b>
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
            <b>Categories</b>
            <small>
              {counts.expense} spending · {counts.income} income · {counts.saving} savings
            </small>
          </div>
          <span className="val">
            <Icon name="chevron-right" />
          </span>
        </Link>
      </div>

      <div className="section-h">
        <h2>Device</h2>
      </div>
      <div className="set-group">
        <InstallRow />
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="cloud-off" />
          </span>
          <div className="mid">
            <b>
              Offline mode<span className="soon">Soon</span>
            </b>
            <small>Log without a connection, synced when you are back online</small>
          </div>
        </div>
      </div>

      <div className="section-h">
        <h2>Account</h2>
      </div>
      <div className="set-group">
        <div className="set-row">
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="users" />
          </span>
          <div className="mid">
            <b>Signed in</b>
            <small>{email ?? ''}</small>
          </div>
          <form action={signOut}>
            <button className="btn-sm" style={{ background: 'var(--surface-2)' }}>
              <Icon name="log-out" size={15} />
              Sign out
            </button>
          </form>
        </div>
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
        <b>Add to home screen</b>
        <small>{installed ? 'Installed on this device' : ios ? 'In Safari: Share › Add to Home Screen' : 'Open Ma moni like a native app'}</small>
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
          Install
        </button>
      )}
    </div>
  )
}
