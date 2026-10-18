import { NextResponse, type NextRequest } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays } from '@/lib/format'

/**
 * Sends reminder pushes. Call it every 15 minutes with `Authorization: Bearer $CRON_SECRET`
 * (Supabase pg_cron, Vercel Cron, or any scheduler). Safe to call more often: each user's daily
 * slot is processed once per local day, and nudges at most once every 24 hours.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 })
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@example.com', pub, priv)

  const db = createAdminClient()
  const { data: subs, error } = await db.from('push_subscriptions').select('user_id, endpoint, p256dh, auth')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const byUser = new Map<string, typeof subs>()
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  if (!byUser.size) return NextResponse.json({ users: 0, sent: 0 })

  const { data: profiles } = await db.from('profiles').select('*').in('id', [...byUser.keys()])
  let sent = 0

  const push = async (userId: string, payload: { title: string; body: string; url: string; tag: string }) => {
    for (const s of byUser.get(userId) ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload))
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
  }

  for (const p of profiles ?? []) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', { timeZone: p.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
        .formatToParts(new Date())
        .map((x) => [x.type, x.value]),
    )
    const today = `${parts.year}-${parts.month}-${parts.day}`
    const nowMin = Number(parts.hour) * 60 + Number(parts.minute)
    const [rh, rm] = String(p.reminder_time).split(':').map(Number)
    const slotMin = rh * 60 + rm
    const inSlot = nowMin >= slotMin && nowMin - slotMin <= 180 && p.last_reminded_on !== today

    if (inSlot) {
      const day = parts.weekday as string
      const freqOk = p.reminder_frequency === 'daily' || (p.reminder_frequency === 'weekly' ? day === 'Sun' : ['Mon', 'Wed', 'Fri'].includes(day))
      if (p.reminder_enabled && freqOk) {
        await push(p.id, { title: 'Time for a quick check-in?', body: 'Take 30 seconds to log today’s spending.', url: '/', tag: `daily-${today}` })
      }

      await db.from('profiles').update({ last_reminded_on: today }).eq('id', p.id)
    }

    // Nudge after 2 quiet days, at a reasonable hour, at most once a day.
    if (p.nudge_enabled && nowMin >= 9 * 60 && nowMin <= 21 * 60) {
      const lastNudge = p.last_nudged_at ? new Date(p.last_nudged_at).getTime() : 0
      if (Date.now() - lastNudge > 24 * 3600e3) {
        const { data: last } = await db.from('transactions').select('occurred_on').eq('user_id', p.id).order('occurred_on', { ascending: false }).limit(1)
        if (last?.[0] && last[0].occurred_on <= addDays(today, -2)) {
          await push(p.id, { title: 'Time to catch up?', body: 'Nothing logged for 2 days. Take 30 seconds to catch up.', url: '/', tag: 'nudge' })
          await db.from('profiles').update({ last_nudged_at: new Date().toISOString() }).eq('id', p.id)
        }
      }
    }
  }

  return NextResponse.json({ users: profiles?.length ?? 0, sent })
}
