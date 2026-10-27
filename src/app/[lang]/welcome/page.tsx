import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CurrencySync } from '@/components/currency'
import { WelcomeFlow } from '@/components/welcome/WelcomeFlow'
import { getProfile } from '@/lib/data'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.welcome }
}

type SP = Promise<{ replay?: string }>

export default function WelcomePage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<main className="welcome" />}>
      <Flow searchParams={searchParams} />
    </Suspense>
  )
}

async function Flow({ searchParams }: { searchParams: SP }) {
  const [sp, profile] = await Promise.all([searchParams, getProfile()])
  return (
    <>
      <CurrencySync code={profile.currency} />
      <WelcomeFlow replay={sp.replay === '1'} currency={profile.currency} timezone={profile.timezone} />
    </>
  )
}
