'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { ICON_NAMES } from './icon-names'
import { useAddSheet } from './AppShell'
import { useToast } from './Toast'
import { useLang, useT } from './i18n'
import { deleteCategory, saveCategory } from '@/lib/actions'
import { tint } from '@/lib/format'
import { categoryDeleteBlock } from '@/lib/tontine'
import { PALETTE, type Category, type CategoryKind, type PaletteKey } from '@/lib/types'

export function CategoryEditor({ kind, category, siblings, usage, from }: { kind: CategoryKind; category?: Category; siblings: string[]; usage: number; from?: string }) {
  const router = useRouter()
  const toast = useToast()
  const { open } = useAddSheet()
  const [pending, start] = useTransition()
  const lang = useLang()
  const m = useT()
  const c = m.categories
  const typeName = c.tabs[kind]
  const [name, setName] = useState(category?.name ?? '')
  const [desc, setDesc] = useState(category?.description ?? '')
  const [icon, setIcon] = useState(category?.icon ?? (kind === 'income' ? 'briefcase' : kind === 'saving' ? 'piggy-bank' : 'shopping-cart'))
  const [color, setColor] = useState<PaletteKey>(category?.color ?? 'violet')
  const [err, setErr] = useState('')

  const trimmed = name.trim()
  const dup = trimmed && siblings.some((s) => s.toLowerCase() === trimmed.toLowerCase())
  const back = from === 'sheet' ? '/' : `/settings/categories${kind === 'expense' ? '' : `?tab=${kind}`}`
  const t = tint(color)
  const last = !!category && siblings.length === 0
  const block = category ? categoryDeleteBlock({ role: category.role, usage, isLast: last, kind }, lang) : null

  const save = () =>
    start(async () => {
      setErr('')
      const res = await saveCategory({ id: category?.id, kind, name: trimmed, icon, color, description: desc })
      if (!res.ok) return setErr(res.error)
      toast(category ? m.common.changesSaved : c.created(trimmed))
      if (from === 'sheet' && (kind === 'expense' || kind === 'income')) {
        router.push('/')
        open({ kind, categoryId: res.data.id })
      } else router.push(back)
    })

  const remove = () =>
    start(async () => {
      const res = await deleteCategory(category!.id)
      if (!res.ok) return setErr(res.error)
      toast(m.common.deleted(category!.name))
      router.push(back)
    })

  return (
    <>
      <Link className="back" href={back}>
        <Icon name="chevron-left" />
        {from === 'sheet' ? m.common.back : m.meta.categories}
      </Link>
      <header className="top" style={{ paddingTop: 8 }}>
        <div className="grow">
          <h1>{category ? m.meta.editCategory : c.newOf[kind]}</h1>
        </div>
      </header>
      <div className="panel ce-preview" aria-hidden="true">
        <span className="tile" style={t}>
          <Icon name={icon} />
        </span>
        <div style={{ minWidth: 0 }}>
          <b style={trimmed ? undefined : { color: 'var(--ink-3)' }}>{trimmed || c.namePlaceholder}</b>
          <small>
            {typeName}
            {kind === 'saving' && desc.trim() ? ` · ${desc.trim()}` : ''}
          </small>
        </div>
      </div>
      <div className="panel stack" style={{ marginTop: 14 }}>
        <div className="fld">
          <label htmlFor="ce-name">{m.common.name}</label>
          <div className="money">
            <input id="ce-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && trimmed && !dup && save()} maxLength={24} placeholder={c.nameExample} autoComplete="off" autoFocus={!category} />
          </div>
          <span className="err" role="alert">
            {dup ? c.duplicate(typeName, trimmed) : err}
          </span>
        </div>
        {kind === 'saving' && (
          <div className="fld">
            <label htmlFor="ce-desc">
              {c.description} <span className="muted" style={{ fontWeight: 450 }}>{m.common.optional}</span>
            </label>
            <div className="money">
              <input id="ce-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={48} placeholder={c.descriptionExample} autoComplete="off" />
            </div>
          </div>
        )}
      </div>

      <div className="section-h">
        <h2>{c.icon}</h2>
      </div>
      <div className="panel">
        <div className="icon-grid" role="radiogroup" aria-label={c.icon} style={{ ['--sel' as string]: t.color }}>
          {ICON_NAMES.map((i) => (
            <button key={i} className="ic" role="radio" aria-checked={i === icon} aria-label={i.replace(/-/g, ' ')} onClick={() => setIcon(i)}>
              <Icon name={i} />
            </button>
          ))}
        </div>
      </div>

      <div className="section-h">
        <h2>{c.color}</h2>
      </div>
      <div className="panel">
        <div className="swatches" role="radiogroup" aria-label={c.color}>
          {PALETTE.map((k) => (
            <button key={k} className="sw-b" role="radio" aria-checked={k === color} aria-label={m.colors[k]} onClick={() => setColor(k)} style={{ background: `var(--pal-${k})`, ['--ring' as string]: `var(--pal-${k})` }}>
              <Icon name="check" />
            </button>
          ))}
        </div>
      </div>

      <button className="btn block" style={{ marginTop: 20 }} disabled={!trimmed || !!dup || pending} onClick={save}>
        <Icon name={pending ? 'loader' : 'check'} />
        {category ? m.common.saveChanges : c.create}
      </button>

      {category && (
        <div className="danger-zone">
          <button className="btn-danger" disabled={!!block || pending} onClick={remove}>
            <Icon name="trash-2" />
            {c.delete}
          </button>
          <span className="hint">{block ?? c.cantUndo}</span>
        </div>
      )}
    </>
  )
}
