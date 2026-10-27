import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Icon } from '@/components/Icon'
import { Skeleton, Tile } from '@/components/ui'
import { requireUser } from '@/lib/supabase/server'
import { getCategories, getPots } from '@/lib/data'
import { getT } from '@/lib/i18n/server'
import type { CategoryKind } from '@/lib/types'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.categories }
}

const TABS: CategoryKind[] = ['expense', 'income', 'saving']

type SP = Promise<{ tab?: string }>

export default async function CategoriesPage({ searchParams }: { searchParams: SP }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.meta.categories}>
      <div className="ce-wrap">
        <Link className="back" href="/settings">
          <Icon name="chevron-left" />
          {t.meta.settings}
        </Link>
        <header className="top" style={{ paddingTop: 8 }}>
          <div className="grow">
            <h1>{t.meta.categories}</h1>
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
  const [{ supabase }, t] = await Promise.all([requireUser(), getT()])
  const c = t.categories
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
    return tab === 'saving' ? c.pots(n) : c.transactions(n)
  }
  const idx = TABS.indexOf(tab)

  return (
    <>
      <nav className="seg" aria-label={c.type}>
        <span className="thumb" style={{ width: 'calc((100% - 6px)/3)', transform: `translateX(${idx * 100}%)` }} />
        {TABS.map((k) => (
          <Link key={k} href={`/settings/categories${k === 'expense' ? '' : `?tab=${k}`}`} aria-current={tab === k ? 'page' : undefined} className="seg-link" replace scroll={false}>
            {c.tabs[k]}
          </Link>
        ))}
      </nav>
      <p className="hint" style={{ margin: '10px 2px 12px' }}>
        {c.hints[tab]}
      </p>
      <div className="set-group">
        {list.map((cat) => (
          <Link key={cat.id} className="set-row" href={`/settings/categories/${cat.id}`}>
            <Tile icon={cat.icon} color={cat.color} />
            <div className="mid">
              <b>
                {cat.name}
                {!cat.is_default && <span className="badge">{c.custom}</span>}
              </b>
              <small>{label(cat.id)}</small>
            </div>
            <span className="val">
              <Icon name="chevron-right" />
            </span>
          </Link>
        ))}
      </div>
      <Link className="btn block" style={{ marginTop: 14 }} href={`/settings/categories/new?kind=${tab}`}>
        <Icon name="plus" />
        {c.newOf[tab]}
      </Link>
    </>
  )
}
