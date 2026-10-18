import { NextResponse, type NextRequest } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays } from '@/lib/format'
import { groupCoverage, planTontineReminders } from '@/lib/tontine'

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

    // Tontine groups: payment due tomorrow, missed payment, turn day.
    const [{ data: groups }, { data: turns }, { data: paidRows }] = await Promise.all([
      db.from('tontine_groups').select('*').eq('user_id', p.id).eq('status', 'active').eq('reminders_enabled', true),
      db.from('tontine_turns').select('id, group_id, turn_on, status, notified_on, expected_amount').eq('user_id', p.id).eq('status', 'upcoming'),
      db.from('transactions').select('group_id, amount').eq('user_id', p.id).eq('kind', 'expense').not('group_id', 'is', null),
    ])
    for (const g of groups ?? []) {
      const paidTotal = (paidRows ?? []).filter((r) => r.group_id === g.id).reduce((a, r) => a + Number(r.amount), 0)
      const plan = planTontineReminders({
        groupId: g.id,
        name: g.name,
        coverage: groupCoverage(g, Math.max(0, paidTotal - Number(g.payments_offset)), today, nowMin),
        deadlineTime: String(g.deadline_time).slice(0, 5),
        today,
        nowMinutes: nowMin,
        reminderMinutes: slotMin,
        lastDueFor: g.last_due_reminder_for,
        lastBehindFor: g.last_behind_reminder_for,
        turns: (turns ?? [])
          .filter((t) => t.group_id === g.id)
          .map((t) => ({ id: t.id, turnOn: t.turn_on, status: t.status, notifiedOn: t.notified_on, expectedAmount: Number(t.expected_amount) })),
      })
      for (const msg of plan.pushes) await push(p.id, msg)
      const marks: Record<string, string> = {}
      if (plan.dueFor) marks.last_due_reminder_for = plan.dueFor
      if (plan.behindFor) marks.last_behind_reminder_for = plan.behindFor
      if (Object.keys(marks).length) await db.from('tontine_groups').update(marks).eq('id', g.id)
      if (plan.notifiedTurns.length) await db.from('tontine_turns').update({ notified_on: today }).in('id', plan.notifiedTurns)
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
