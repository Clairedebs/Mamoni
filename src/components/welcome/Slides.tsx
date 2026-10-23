'use client'

import { BalanceCard } from '../BalanceCard'
import { Icon } from '../Icon'
import { Keypad } from '../Keypad'
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
  return (
    <Frame>
      <BalanceCard available={578750} savings={2433500} income={485000} expense={300750} month="Oct" />
    </Frame>
  )
}

function LogIllo() {
  const cats = [
    ['Groceries', 'shopping-basket', 'green'],
    ['Transport', 'bus', 'cyan'],
    ['Housing', 'house-plug', 'purple'],
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
  const pots = [
    ['Savings account', 'Bank', 'landmark', 'blue', '1,150,000', 76],
    ['Family pot', 'Family', 'users', 'coral', '238,500', 40],
    ['New motorbike', 'Project', 'piggy-bank', 'violet', '150,000', 30],
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
  return (
    <Frame>
      <div className="panel wl-mini" style={{ padding: '6px 16px 8px' }}>
        <div className="row">
          <span className="tile" style={tint('teal')}>
            <Icon name="hand-coins" />
          </span>
          <span className="mid">
            <b>Friday tontine</b>
            <small>Covered until Fri, Nov 14</small>
          </span>
        </div>
        <div className="row">
          <span className="tile" style={tint('violet')}>
            <Icon name="calendar" />
          </span>
          <span className="mid">
            <b>Your turn · Fri, Dec 5</b>
            <small style={{ color: 'var(--brand-ink)', fontWeight: 600 }}>
              Payout 50,000 <span className="cur" />
            </small>
          </span>
        </div>
        <div className="row">
          <span className="tile" style={tint('amber')}>
            <Icon name="bell-ring" />
          </span>
          <span className="mid">
            <b>Reminder the evening before</b>
            <small>Only when you&apos;re not paid ahead</small>
          </span>
        </div>
      </div>
    </Frame>
  )
}

export const SLIDES = [
  {
    title: 'Your money, at a glance',
    body: 'See what you own, what came in and what went out this month — all on one card.',
    illo: <MoneyIllo />,
  },
  {
    title: 'Log in seconds',
    body: 'Tap + to add an expense or an income and pick a category. Made a mistake? Tap the line later to fix or delete it.',
    illo: <LogIllo />,
  },
  {
    title: 'Savings in pots',
    body: 'Keep pots for the bank, the family or a project, with a starting balance and an optional goal.',
    illo: <SavingsIllo />,
  },
  {
    title: 'Tontines without the stress',
    body: 'Set how much you pay, how often and on which day, the names in the group and yours, and your collection dates. Moni yem shows how far ahead you’ve paid and reminds you.',
    illo: <TontineIllo />,
    hint: 'You’ll find Tontines on the Savings page.',
  },
]
