import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Fragment } from 'react'
import { Icon } from '@/components/Icon'
import { getT } from '@/lib/i18n/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.connect }
}

/** Renders `code` and **bold** spans from a translated step. */
function Rich({ text }: { text: string }) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  )
}

/** Shown until the Supabase environment variables are filled in. */
export default async function SetupPage() {
  if (isSupabaseConfigured) redirect('/')
  const t = (await getT()).connect
  return (
    <main className="auth">
      <div className="auth-card" style={{ width: 'min(560px,100%)' }}>
        <div className="auth-brand">
          <svg className="appicon" aria-hidden="true">
            <use href="#logo" />
          </svg>
          <b>Moni yem</b>
        </div>
        <h1>{t.heading}</h1>
        <p className="lead">{t.lead}</p>
        <ol className="setup-steps">
          {t.steps.map((s) => (
            <li key={s}>
              <Rich text={s} />
            </li>
          ))}
        </ol>
        <div className="notice" style={{ marginTop: 16 }}>
          <Icon name="sparkles" />
          <span>{t.keysNote}</span>
        </div>
      </div>
    </main>
  )
}
