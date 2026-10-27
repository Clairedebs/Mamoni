import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getT } from '@/lib/i18n/server'
import { LoginForm } from './LoginForm'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.signIn }
}

type SP = Promise<{ next?: string; confirmed?: string; error?: string }>

export default function LoginPage({ searchParams }: { searchParams: SP }) {
  return (
    <main className="auth">
      <Suspense fallback={<LoginForm />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Form({ searchParams }: { searchParams: SP }) {
  const [sp, t] = await Promise.all([searchParams, getT()])
  const notice = sp.confirmed ? t.login.confirmed : sp.error ? t.login.linkExpired : undefined
  return <LoginForm next={sp.next} notice={notice} />
}
