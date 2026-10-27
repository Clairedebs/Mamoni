import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { CategoryEditor } from '@/components/CategoryEditor'
import { Skeleton } from '@/components/ui'
import { getCategories, getPots } from '@/lib/data'
import { getT } from '@/lib/i18n/server'
import { requireUser } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.editCategory }
}

type P = Promise<{ id: string }>

export default async function EditCategoryPage({ params }: { params: P }) {
  const t = await getT()
  return (
    <section className="view" aria-label={t.meta.editCategory}>
      <div className="ce-wrap">
        <Suspense fallback={<Skeleton h={560} style={{ borderRadius: 22 }} />}>
          <Editor params={params} />
        </Suspense>
      </div>
    </section>
  )
}

async function Editor({ params }: { params: P }) {
  const { id } = await params
  const [{ supabase }, cats, pots] = await Promise.all([requireUser(), getCategories(), getPots()])
  const category = cats.find((c) => c.id === id)
  if (!category) notFound()
  let usage = pots.filter((p) => p.category_id === id).length
  if (category.kind !== 'saving') {
    const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('category_id', id)
    usage = count ?? 0
  }
  return (
    <CategoryEditor
      kind={category.kind}
      category={category}
      siblings={cats.filter((c) => c.kind === category.kind && c.id !== id).map((c) => c.name)}
      usage={usage}
    />
  )
}
