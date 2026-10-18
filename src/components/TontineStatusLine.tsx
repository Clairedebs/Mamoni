import Link from 'next/link'
import { Icon } from './Icon'
import { tint } from '@/lib/format'
import type { TontineView } from '@/lib/data'
import type { PaletteKey } from '@/lib/types'

const TONE: Record<TontineView['status']['tone'], PaletteKey> = { ok: 'teal', soon: 'amber', late: 'red', turn: 'violet', done: 'slate' }

/** One line per group: name and where you stand. */
export function TontineStatusLine({ view, href }: { view: TontineView; href?: string }) {
  const k = TONE[view.status.tone]
  return (
    <Link className="row" href={href ?? `/tontines/${view.group.id}`}>
      <span className="tile" style={tint(k)}>
        <Icon name="hand-coins" />
      </span>
      <span className="mid">
        <b>{view.group.name}</b>
        <small style={view.status.tone === 'late' ? { color: 'var(--neg)', fontWeight: 600 } : view.status.tone === 'turn' ? { color: 'var(--brand-ink)', fontWeight: 600 } : undefined}>{view.status.text}</small>
      </span>
      <Icon name="chevron-right" style={{ color: 'var(--ink-3)' }} />
    </Link>
  )
}
