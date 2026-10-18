import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { Skeleton, Tile } from '@/components/ui'
import { requireUser } from '@/lib/supabase/server'
import { getCategories, getPots } from '@/lib/data'
import type { CategoryKind } from '@/lib/types'

export const metadata: Metadata = { title: 'Categories' }

const TABS: [CategoryKind, string][] = [
  ['expense', 'Spending'],
  ['income', 'Income'],
  ['saving', 'Savings'],
]
const HINT: Record<CategoryKind, string> = {
  expense: 'Group what you spend so you can see where your money goes.',
  income: 'Track where your money comes from.',
  saving: 'Each savings category holds one or more pots, like a tontine or a bank account.',
}

type SP = Promise<{ tab?: string }>

export default function CategoriesPage({ searchParams }: { searchParams: SP }) {
  return (
    <section className="view" aria-label="Categories">
      <div className="ce-wrap">
        <Link className="back" href="/settings">
          <Icon name="chevron-left" />
          Settings
        </Link>
        <header className="top" style={{ paddingTop: 8 }}>
          <div className="grow">
            <h1>Categories</h1>
          </div>
        </header>
        <Suspense fallback={<Skeleton h={460} style={{ borderRadius: 22 }} />}>
          <List searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}

async function List({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const tab: CategoryKind = sp.tab === 'income' || sp.tab === 'saving' ? sp.tab : 'expense'
  const { supabase } = await requireUser()
  const [cats, pots, { data: used }] = await Promise.all([
    getCategories(),
    getPots(),
    supabase.from('transactions').select('category_id').not('category_id', 'is', null),
  ])
  const usage = new Map<string, number>()
  for (const r of (used ?? []) as { category_id: string }[]) usage.set(r.category_id, (usage.get(r.category_id) ?? 0) + 1)
  const list = cats.filter((c) => c.kind === tab)
  const label = (id: string) => {
    const n = tab === 'saving' ? pots.filter((p) => p.category_id === id).length : (usage.get(id) ?? 0)
    if (tab === 'saving') return n ? `${n} pot${n > 1 ? 's' : ''}` : 'No pots yet'
    return n ? `${n} transaction${n > 1 ? 's' : ''}` : 'Not used yet'
  }
  const idx = TABS.findIndex(([k]) => k === tab)

  return (
    <>
      <nav className="seg" aria-label="Category type">
        <span className="thumb" style={{ width: 'calc((100% - 6px)/3)', transform: `translateX(${idx * 100}%)` }} />
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/settings/categories${k === 'expense' ? '' : `?tab=${k}`}`} aria-current={tab === k ? 'page' : undefined} className="seg-link" replace scroll={false}>
            {l}
          </Link>
        ))}
      </nav>
      <p className="hint" style={{ margin: '10px 2px 12px' }}>
        {HINT[tab]}
      </p>
      <div className="set-group">
        {list.map((c) => (
          <Link key={c.id} className="set-row" href={`/settings/categories/${c.id}`}>
            <Tile icon={c.icon} color={c.color} />
            <div className="mid">
              <b>
                {c.name}
                {!c.is_default && <span className="badge">Custom</span>}
              </b>
              <small>{label(c.id)}</small>
            </div>
            <span className="val">
              <Icon name="chevron-right" />
            </span>
          </Link>
        ))}
      </div>
      <Link className="btn block" style={{ marginTop: 14 }} href={`/settings/categories/new?kind=${tab}`}>
        <Icon name="plus" />
        New {TABS[idx][1].toLowerCase()} category
      </Link>
    </>
  )
}
