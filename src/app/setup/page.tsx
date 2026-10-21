import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Icon } from '@/components/Icon'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const metadata: Metadata = { title: 'Connect Supabase' }

/** Shown until the Supabase environment variables are filled in. */
export default function SetupPage() {
  if (isSupabaseConfigured) redirect('/')
  return (
    <main className="auth">
      <div className="auth-card" style={{ width: 'min(560px,100%)' }}>
        <div className="auth-brand">
          <svg className="appicon" aria-hidden="true">
            <use href="#logo" />
          </svg>
          <b>Moni yem</b>
        </div>
        <h1>Connect your database</h1>
        <p className="lead">Moni yem stores your data in your own Supabase project. Four steps and you&apos;re in.</p>
        <ol className="setup-steps">
          <li>
            Create a free project at <b>supabase.com</b> (choose a region close to you, e.g. Frankfurt or London).
          </li>
          <li>
            In the SQL editor, run <code>supabase/migrations/20261018000000_init.sql</code> from this repo.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and paste your <b>Project URL</b> and <b>publishable key</b> (Project Settings › API).
          </li>
          <li>
            Restart <code>npm run dev</code> and reload this page.
          </li>
        </ol>
        <div className="notice" style={{ marginTop: 16 }}>
          <Icon name="sparkles" />
          <span>Your keys stay on your computer in .env.local, which is never committed to git.</span>
        </div>
      </div>
    </main>
  )
}
