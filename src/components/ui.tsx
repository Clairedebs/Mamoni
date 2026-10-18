import { Icon } from './Icon'
import { MONTHS, fmt, parseIso, tint } from '@/lib/format'
import type { Category, PaletteKey, Pot, Transaction } from '@/lib/types'

export function Money({ n, sign = '' }: { n: number; sign?: string }) {
  return (
    <>
      {sign}
      {fmt(n)}
      <span className="cur">FCFA</span>
    </>
  )
}

export function Tile({ icon, color, style }: { icon: string; color: PaletteKey; style?: React.CSSProperties }) {
  return (
    <span className="tile" style={{ ...tint(color), ...style }}>
      <Icon name={icon} />
    </span>
  )
}

/** Resolves what a transaction should look like (icon, colour, labels). */
export function describe(t: Transaction, cats: Category[], pots: Pot[]) {
  if (t.pot_id) {
    const p = pots.find((p) => p.id === t.pot_id)
    const c = cats.find((c) => c.id === p?.category_id)
    return { name: p?.name ?? 'Savings pot', icon: c?.icon ?? 'piggy-bank', color: (c?.color ?? 'violet') as PaletteKey, group: c?.name ?? 'Savings' }
  }
  const c = cats.find((c) => c.id === t.category_id)
  return { name: c?.name ?? 'Category', icon: c?.icon ?? 'tag', color: (c?.color ?? 'slate') as PaletteKey, group: c?.name ?? '' }
}

export function TxRow({ t, cats, pots, sub }: { t: Transaction; cats: Category[]; pots: Pot[]; sub?: string }) {
  const d = describe(t, cats, pots)
  const isIn = t.kind === 'income' || t.kind === 'withdrawal'
  const title = t.note || (t.kind === 'deposit' ? `Deposit · ${d.name}` : t.kind === 'withdrawal' ? `Withdrawal · ${d.name}` : d.name)
  const subtitle = sub ?? (t.pot_id ? `Savings · ${d.group}` : d.name)
  return (
    <div className="row">
      <Tile icon={d.icon} color={d.color} />
      <span className="mid">
        <b>{title}</b>
        <small>{subtitle}</small>
      </span>
      <span className={`amt num${t.kind === 'income' ? ' in' : ''}`}>
        <Money n={Number(t.amount)} sign={isIn ? '+' : '−'} />
      </span>
    </div>
  )
}

export function FlowChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const W = 520, H = 168, pad = 22
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense])) * 1.08
  const gw = W / data.length, bw = Math.min(18, gw * 0.26)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + pad}`} role="img" aria-label="Income and spending over 6 months">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--line)" strokeDasharray={f ? '3 4' : undefined} />
      ))}
      {data.map((d, i) => {
        const cx = gw * i + gw / 2, hi = (H * d.income) / max, ho = (H * d.expense) / max, last = i === data.length - 1
        return (
          <g key={d.month}>
            <rect x={cx - bw - 2} y={H - hi} width={bw} height={hi} rx="5" fill="var(--brand)" opacity={last ? 1 : 0.55} />
            <rect x={cx + 2} y={H - ho} width={bw} height={ho} rx="5" fill="var(--line-strong)" opacity={last ? 1 : 0.75} />
            <text x={cx} y={H + 16} textAnchor="middle" style={last ? { fill: 'var(--ink)', fontWeight: 600 } : undefined}>
              {MONTHS[parseIso(d.month).getMonth()]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function SavingsLine({ points }: { points: { month: string; total: number }[] }) {
  const W = 520, H = 110
  const vals = points.map((p) => p.total)
  const max = Math.max(...vals) * 1.04 || 1
  const min = Math.min(...vals) * 0.9
  const span = max - min || 1
  const pts = vals.map((v, i) => [i * (W / Math.max(1, vals.length - 1)), H - ((v - min) / span) * H])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const l = pts[pts.length - 1]
  return (
    <svg className="chart" viewBox={`-6 -6 ${W + 12} ${H + 30}`} role="img" aria-label="Savings growth over 6 months">
      <path d={`${d}L${W},${H}L0,${H}Z`} fill="var(--brand)" opacity=".09" />
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={l[0]} cy={l[1]} r="5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="3" />
      {points.map((p, i) => (
        <text key={p.month} x={pts[i][0]} y={H + 22} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
          {MONTHS[parseIso(p.month).getMonth()]}
        </text>
      ))}
    </svg>
  )
}

export function SavingsBar({ groups, total }: { groups: { cat: Category; total: number }[]; total: number }) {
  return (
    <>
      <div className="bar" aria-hidden="true">
        {groups.map((g) => (
          <i key={g.cat.id} style={{ flexGrow: g.total, background: `var(--pal-${g.cat.color})` }} />
        ))}
      </div>
      <div className="legend">
        {groups.map((g) => (
          <div key={g.cat.id} className="leg">
            <span className="sw" style={{ background: `var(--pal-${g.cat.color})` }} />
            <span className="n">{g.cat.name}</span>
            <span className="num" style={{ fontWeight: 600 }}>
              <Money n={g.total} />
            </span>
            <span className="p num">{total ? Math.round((g.total / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </>
  )
}

export function Skeleton({ h, style }: { h: number; style?: React.CSSProperties }) {
  return <div className="skel" style={{ height: h, ...style }} aria-hidden="true" />
}
