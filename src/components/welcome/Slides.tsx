'use client'

import { BalanceCard } from '../BalanceCard'
import { Icon } from '../Icon'
import { Keypad } from '../Keypad'
import { useT } from '../i18n'
import { tint } from '@/lib/format'

/** Illustrations built from the app's real pieces, filled with sample numbers. Purely decorative. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="wl-frame" aria-hidden="true" inert>
      {children}
    </div>
  )
}

function MoneyIllo() {
  const m = useT()
  return (
    <Frame>
      <BalanceCard available={578750} savings={2433500} income={485000} expense={300750} month={m.date.months[9]} />
    </Frame>
  )
}

function LogIllo() {
  const names = useT().welcome.illo.categories
  const cats = [
    [names[0], 'shopping-basket', 'green'],
    [names[1], 'bus', 'cyan'],
    [names[2], 'house-plug', 'purple'],
  ] as const
  return (
    <Frame>
      <div className="panel wl-mini">
        <div className="amount" style={{ padding: '4px 0 6px' }}>
          <div className="v num" style={{ fontSize: 38 }}>
            12,500
            <span className="cur" />
          </div>
        </div>
        <div className="catpick" style={{ margin: 0, padding: '4px 0 10px', overflow: 'hidden' }}>
          {cats.map(([n, i, k], idx) => (
            <span key={n} className="cp" aria-pressed={idx === 1} style={{ color: `var(--pal-${k})` }}>
              <span className="tile" style={tint(k)}>
                <Icon name={i} />
              </span>
              <span style={{ color: 'var(--ink-2)' }}>{n}</span>
            </span>
          ))}
        </div>
        <Keypad onKey={() => {}} />
      </div>
    </Frame>
  )
}

function SavingsIllo() {
  const names = useT().welcome.illo.pots
  const pots = [
    [names[0][0], names[0][1], 'landmark', 'blue', '1,150,000', 76],
    [names[1][0], names[1][1], 'users', 'coral', '238,500', 40],
    [names[2][0], names[2][1], 'piggy-bank', 'violet', '150,000', 30],
  ] as const
  return (
    <Frame>
      <div className="group wl-mini">
        {pots.map(([name, group, icon, k, amount, goal]) => (
          <div key={name} className="pocket" style={{ borderTop: 0 }}>
            <span className="tile" style={tint(k)}>
              <Icon name={icon} />
            </span>
            <span className="mid">
              <b>{name}</b>
              <small>{group}</small>
              <span className="mini-track">
                <i style={{ width: `${goal}%`, background: `var(--pal-${k})` }} />
              </span>
            </span>
            <span className="r">
              <strong className="num">
                {amount}
                <span className="cur" />
              </strong>
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function TontineIllo() {
  const t = useT().welcome.illo
  return (
    <Frame>
      <div className="panel wl-mini" style={{ padding: '6px 16px 8px' }}>
        <div className="row">
          <span className="tile" style={tint('teal')}>
            <Icon name="hand-coins" />
          </span>
          <span className="mid">
            <b>{t.tontineName}</b>
            <small>{t.coveredUntil}</small>
          </span>
        </div>
        <div className="row">
          <span className="tile" style={tint('violet')}>
            <Icon name="calendar" />
          </span>
          <span className="mid">
            <b>{t.yourTurn}</b>
            <small style={{ color: 'var(--brand-ink)', fontWeight: 600 }}>
              {t.payout} 50,000 <span className="cur" />
            </small>
          </span>
        </div>
        <div className="row">
          <span className="tile" style={tint('amber')}>
            <Icon name="bell-ring" />
          </span>
          <span className="mid">
            <b>{t.reminder}</b>
            <small>{t.reminderHint}</small>
          </span>
        </div>
      </div>
    </Frame>
  )
}

/** Pictures for each slide, in order; titles and text come from `welcome.slides`. */
export const SLIDE_ILLOS = [<MoneyIllo key="money" />, <LogIllo key="log" />, <SavingsIllo key="savings" />, <TontineIllo key="tontine" />]
