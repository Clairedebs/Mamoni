import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const TYPES: EmailOtpType[] = ['signup', 'email', 'invite', 'magiclink', 'recovery', 'email_change']

/**
 * Email links land here: `?token_hash=…&type=email`. Unlike /auth/callback, verifying the hash needs no
 * cookie from the sign-up browser, so the link works from any device or mail app.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = url.searchParams.get('next')

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/savings/setup?welcome=1'
      return NextResponse.redirect(new URL(target, url.origin))
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin))
}
