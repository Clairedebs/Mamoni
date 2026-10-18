import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

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
  const sp = await searchParams
  const notice = sp.confirmed ? 'Your email is confirmed. You can sign in now.' : sp.error ? 'That link has expired. Sign in or request a new one.' : undefined
  return <LoginForm next={sp.next} notice={notice} />
}
