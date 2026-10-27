'use client'

import { useClientValue } from './useClientValue'
import { Icon } from './Icon'
import { useT } from './i18n'
import { fmt } from '@/lib/format'

const M = ({ n, sign = '' }: { n: number; sign?: string }) => (
  <>
    {sign}
    {fmt(n)}
    <span className="cur" />
  </>
)

function readHidden() {
  try {
    return localStorage.getItem('mm-hide') === '1'
  } catch {
    return false
  }
}
function subscribeHidden(cb: () => void) {
  window.addEventListener('mm-hide', cb)
  return () => window.removeEventListener('mm-hide', cb)
}

export function BalanceCard({ available, savings, income, expense, month }: { available: number; savings: number; income: number; expense: number; month: string }) {
  const hidden = useClientValue(readHidden, false, subscribeHidden)
  const m = useT().balance
  const toggle = () => {
    try {
      localStorage.setItem('mm-hide', hidden ? '0' : '1')
    } catch {}
    window.dispatchEvent(new Event('mm-hide'))
  }

  return (
    <article className={`balance${hidden ? ' masked' : ''}`}>
      <div className="lbl">
        {m.netWorth}
        <button aria-label={hidden ? m.show : m.hide} onClick={toggle}>
          <Icon name={hidden ? 'eye-off' : 'eye'} />
        </button>
      </div>
      <div className="big num mask">
        <M n={available + savings} />
      </div>
      <div className="split mask">
        {m.available}{' '}
        <b className="num">
          <M n={available} />
        </b>{' '}
        · {m.savings}{' '}
        <b className="num">
          <M n={savings} />
        </b>
      </div>
      <div className="flows">
        <div className="flow">
          <span className="ico">
            <Icon name="arrow-down-left" />
          </span>
          <div style={{ minWidth: 0 }}>
            <small>{m.incomeIn(month)}</small>
            <strong className="num mask">
              <M n={income} sign="+" />
            </strong>
          </div>
        </div>
        <div className="flow">
          <span className="ico">
            <Icon name="arrow-up-right" />
          </span>
          <div style={{ minWidth: 0 }}>
            <small>{m.spendingIn(month)}</small>
            <strong className="num mask">
              <M n={expense} sign="−" />
            </strong>
          </div>
        </div>
      </div>
    </article>
  )
}
