'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { useT } from './i18n'

const FILTERS = ['all', 'expense', 'income', 'saving'] as const

export function ActivityControls({ month, prev, next, label }: { month: string; prev: string; next: string | null; label: string }) {
  const params = useSearchParams()
  const router = useRouter()
  const f = params.get('f') ?? 'all'
  const [q, setQ] = useState(params.get('q') ?? '')
  const m = useT()
  const a = m.activity
  const names = { all: a.all, expense: m.common.spending, income: m.common.income, saving: m.common.savings }

  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams(params)
      if (q.trim()) p.set('q', q.trim())
      else p.delete('q')
      if (p.toString() !== params.toString()) router.replace(`/activity?${p}`, { scroll: false })
    }, 250)
    return () => clearTimeout(id)
  }, [q, params, router])

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    return `/activity?${p}`
  }
  const idx = Math.max(0, FILTERS.findIndex((k) => k === f))

  return (
    <>
      <header className="top">
        <div className="grow">
          <h1>{a.title}</h1>
        </div>
        <div className="month-pill" aria-label={a.month}>
          <Link href={href({ m: prev })} aria-label={a.prevMonth} scroll={false}>
            <Icon name="chevron-left" />
          </Link>
          <span>{label}</span>
          {next ? (
            <Link href={href({ m: next })} aria-label={a.nextMonth} scroll={false}>
              <Icon name="chevron-right" />
            </Link>
          ) : (
            <button disabled aria-label={a.nextMonth} style={{ opacity: 0.3 }}>
              <Icon name="chevron-right" />
            </button>
          )}
        </div>
      </header>
      <label className="search">
        <Icon name="search" />
        <span className="sr">{a.search}</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.searchPlaceholder} autoComplete="off" />
      </label>
      <div className="seg" role="group" aria-label={a.filter} data-month={month}>
        <span className="thumb" style={{ width: 'calc((100% - 6px)/4)', transform: `translateX(${idx * 100}%)` }} />
        {FILTERS.map((k) => (
          <button key={k} aria-pressed={f === k} onClick={() => router.replace(href({ f: k === 'all' ? null : k }), { scroll: false })}>
            {names[k]}
          </button>
        ))}
      </div>
    </>
  )
}
