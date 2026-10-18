'use client'

import { useClientValue } from './useClientValue'
import { Icon } from './Icon'
import { fmt } from '@/lib/format'

const M = ({ n, sign = '' }: { n: number; sign?: string }) => (
  <>
    {sign}
    {fmt(n)}
    <span className="cur">FCFA</span>
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
  const toggle = () => {
    try {
      localStorage.setItem('mm-hide', hidden ? '0' : '1')
    } catch {}
    window.dispatchEvent(new Event('mm-hide'))
  }

  return (
    <article className={`balance${hidden ? ' masked' : ''}`}>
      <div className="lbl">
        Net worth
        <button aria-label={hidden ? 'Show amounts' : 'Hide amounts'} onClick={toggle}>
          <Icon name={hidden ? 'eye-off' : 'eye'} />
        </button>
      </div>
      <div className="big num mask">
        <M n={available + savings} />
      </div>
      <div className="split mask">
        Available{' '}
        <b className="num">
          <M n={available} />
        </b>{' '}
        · Savings{' '}
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
            <small>Income · {month}</small>
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
            <small>Spending · {month}</small>
            <strong className="num mask">
              <M n={expense} sign="−" />
            </strong>
          </div>
        </div>
      </div>
    </article>
  )
}
