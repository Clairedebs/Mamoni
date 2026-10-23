'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { Icon } from '../Icon'
import { applyCurrency } from '../currency'
import { useClientValue } from '../useClientValue'
import { SLIDES } from './Slides'
import { changeCurrency, completeOnboarding, updateSettings } from '@/lib/actions'
import { CURRENCIES, searchCurrencies } from '@/lib/currencies'
import { allTimeZones, cityOf, countriesOf, offsetLabel, searchTimeZones } from '@/lib/timezones'

type Stage = 'tour' | 'currency' | 'timezone'
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
const tzLabel = (tz: string) => (countriesOf(tz)[0] ? `${cityOf(tz)}, ${countriesOf(tz)[0]}` : cityOf(tz))

export function WelcomeFlow({ replay, currency, timezone }: { replay: boolean; currency: string; timezone: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [stage, setStage] = useState<Stage>('tour')
  const [i, setI] = useState(0)
  const [cur, setCur] = useState(currency)
  const [curQ, setCurQ] = useState('')
  const detected = useClientValue<string | null>(deviceZone, null)
  const [tz, setTz] = useState<string | null>(null)
  const [tzQ, setTzQ] = useState('')
  const zones = useMemo(() => (stage === 'timezone' ? allTimeZones() : []), [stage])
  const touch = useRef<number | null>(null)
  const last = i === SLIDES.length - 1
  const chosenTz = tz ?? detected ?? timezone

  const leave = (to: string) =>
    start(async () => {
      if (!replay) await completeOnboarding()
      router.replace(to)
    })

  const next = () => {
    if (!last) return setI(i + 1)
    if (replay) return leave('/settings')
    setStage('currency')
  }

  const saveCurrency = () =>
    start(async () => {
      if (cur !== currency) {
        const res = await changeCurrency(cur)
        if (res.ok) applyCurrency(cur)
      }
      setStage('timezone')
    })

  const saveTimezone = () =>
    start(async () => {
      if (chosenTz !== timezone) await updateSettings({ timezone: chosenTz })
      await completeOnboarding()
      router.replace('/savings/setup?welcome=1')
    })

  return (
    <main className="welcome">
      <header className="wl-top">
        <div className="auth-brand" style={{ margin: 0 }}>
          <svg className="appicon" aria-hidden="true">
            <use href="#logo" />
          </svg>
          <b>Moni yem</b>
        </div>
        {stage === 'tour' && (
          <button className="link" onClick={() => leave(replay ? '/settings' : '/')} disabled={pending}>
            Skip
          </button>
        )}
      </header>

      {stage === 'tour' && (
        <section
          className="wl-body"
          aria-roledescription="carousel"
          aria-label="Welcome tour"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return
            const dx = e.changedTouches[0].clientX - touch.current
            touch.current = null
            if (dx < -50) next()
            else if (dx > 50 && i > 0) setI(i - 1)
          }}
        >
          <div className="wl-track" style={{ transform: `translateX(${-i * 100}%)` }}>
            {SLIDES.map((s, n) => (
              <article key={s.title} className="wl-slide" aria-roledescription="slide" aria-label={`${n + 1} of ${SLIDES.length}`} aria-hidden={n !== i}>
                <div className="wl-illo">{s.illo}</div>
                <h1>{s.title}</h1>
                <p>{s.body}</p>
                {s.hint && (
                  <p className="wl-hint">
                    <Icon name="piggy-bank" />
                    {s.hint}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {stage === 'currency' && (
        <section className="wl-body wl-step">
          <div className="wl-progress" role="img" aria-label="Step 1 of 3"><i className="on" /><i className="" /><i className="" /></div>
          <h1>Which currency do you use?</h1>
          <p>Every amount in the app will use it. You can change it later in Settings.</p>
          <label className="search" style={{ margin: '14px 0 10px' }}>
            <Icon name="search" />
            <span className="sr">Search a currency</span>
            <input type="search" value={curQ} onChange={(e) => setCurQ(e.target.value)} placeholder="Search a currency" autoComplete="off" />
          </label>
          <div className="panel wl-list" role="radiogroup" aria-label="Currency">
            {searchCurrencies(CURRENCIES, curQ).map((c) => (
              <button key={c.code} type="button" className="row" role="radio" aria-checked={c.code === cur} onClick={() => setCur(c.code)}>
                <span className="tile cur-tile" aria-hidden="true">
                  {c.symbol}
                </span>
                <span className="mid">
                  <b>{c.name}</b>
                  <small>{c.code}</small>
                </span>
                {c.code === cur && <Icon name="check" style={{ color: 'var(--brand-ink)' }} />}
              </button>
            ))}
          </div>
        </section>
      )}

      {stage === 'timezone' && (
        <section className="wl-body wl-step">
          <div className="wl-progress" role="img" aria-label="Step 2 of 3"><i className="on" /><i className="on" /><i className="" /></div>
          <h1>Where are you?</h1>
          <p>Your time zone decides what “today” is and when reminders arrive.</p>
          <label className="search" style={{ margin: '14px 0 10px' }}>
            <Icon name="search" />
            <span className="sr">Search a city or country</span>
            <input type="search" value={tzQ} onChange={(e) => setTzQ(e.target.value)} placeholder="Search a city or country" autoComplete="off" />
          </label>
          <div className="panel wl-list" role="radiogroup" aria-label="Time zone">
            {detected && !tzQ && (
              <button type="button" className="row" role="radio" aria-checked={chosenTz === detected} onClick={() => setTz(detected)}>
                <span className="tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
                  <Icon name="smartphone" />
                </span>
                <span className="mid">
                  <b>{tzLabel(detected)} (detected)</b>
                  <small>{offsetLabel(detected)}</small>
                </span>
                {chosenTz === detected && <Icon name="check" style={{ color: 'var(--brand-ink)' }} />}
              </button>
            )}
            {(tzQ ? searchTimeZones(zones, tzQ) : []).map((z) => (
              <button key={z} type="button" className="row" role="radio" aria-checked={z === chosenTz} onClick={() => setTz(z)}>
                <span className="mid">
                  <b>{tzLabel(z)}</b>
                  <small>
                    {z.replace(/_/g, ' ')} · {offsetLabel(z)}
                  </small>
                </span>
                {z === chosenTz && <Icon name="check" style={{ color: 'var(--brand-ink)' }} />}
              </button>
            ))}
            {!tzQ && !detected && <p className="hint" style={{ padding: 12 }}>Search your city to pick a time zone.</p>}
          </div>
        </section>
      )}

      <footer className="wl-foot">
        {stage === 'tour' ? (
          <>
            <div className="wl-dots" role="tablist" aria-label="Tour progress">
              {SLIDES.map((s, n) => (
                <button key={s.title} role="tab" aria-selected={n === i} aria-label={`Go to ${n + 1}: ${s.title}`} onClick={() => setI(n)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {i > 0 && (
                <button className="btn ghost" onClick={() => setI(i - 1)}>
                  Back
                </button>
              )}
              <button className="btn" style={{ flex: 1 }} onClick={next} disabled={pending}>
                {last ? (replay ? 'Done' : 'Set up my account') : 'Next'}
                <Icon name={last && replay ? 'check' : 'chevron-right'} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={() => (stage === 'currency' ? setStage('tour') : setStage('currency'))} disabled={pending}>
              Back
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={stage === 'currency' ? saveCurrency : saveTimezone} disabled={pending}>
              <Icon name={pending ? 'loader' : 'chevron-right'} />
              Continue
            </button>
          </div>
        )}
      </footer>
    </main>
  )
}
