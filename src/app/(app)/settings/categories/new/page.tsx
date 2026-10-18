import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CategoryEditor } from '@/components/CategoryEditor'
import { Skeleton } from '@/components/ui'
import { getCategories } from '@/lib/data'
import type { CategoryKind } from '@/lib/types'

export const metadata: Metadata = { title: 'New category' }

type SP = Promise<{ kind?: string; from?: string }>

export default function NewCategoryPage({ searchParams }: { searchParams: SP }) {
  return (
    <section className="view" aria-label="New category">
      <div className="ce-wrap">
        <Suspense fallback={<Skeleton h={560} style={{ borderRadius: 22 }} />}>
          <Editor searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}

async function Editor({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const kind: CategoryKind = sp.kind === 'income' || sp.kind === 'saving' ? sp.kind : 'expense'
  const cats = await getCategories()
  return <CategoryEditor kind={kind} siblings={cats.filter((c) => c.kind === kind).map((c) => c.name)} usage={0} from={sp.from} />
}
