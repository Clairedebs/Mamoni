'use client'

import { useEffect, useState, useTransition } from 'react'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { removePushSubscription, savePushSubscription, sendTestNotification } from '@/lib/actions'

function urlB64(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

type State = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

/** Turns push notifications on/off for this device and sends a test. */
export function PushToggle() {
  const toast = useToast()
  const [state, setState] = useState<State>('loading')
  const [pending, start] = useTransition()

  useEffect(() => {
    ;(async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const standalone = matchMedia('(display-mode: standalone)').matches
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setState(ios && !standalone ? 'ios-install' : 'unsupported')
      if (Notification.permission === 'denied') return setState('denied')
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      setState(sub ? 'on' : 'off')
    })()
  }, [])

  const enable = () =>
    start(async () => {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!key) return toast('Push keys are missing on the server.')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return setState(perm === 'denied' ? 'denied' : 'off')
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }))
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) })
      const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)))
      if (!res.ok) return toast(res.error)
      setState('on')
      toast('Notifications are on for this device')
    })

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
    })

  const test = () =>
    start(async () => {
      const res = await sendTestNotification()
      toast(res.ok ? 'Test notification sent' : res.error)
    })

  const sub =
    state === 'ios-install'
      ? 'On iPhone, add Ma moni to your Home Screen first (Share › Add to Home Screen).'
      : state === 'unsupported'
        ? 'This browser can’t receive notifications.'
        : state === 'denied'
          ? 'Notifications are blocked. Allow them in your browser settings.'
          : 'Reminders arrive even when the app is closed'

  return (
    <>
      <div className="set-row">
        <span className="tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
          <Icon name="bell" />
        </span>
        <div className="mid">
          <b>Notifications on this device</b>
          <small>{sub}</small>
        </div>
        {(state === 'on' || state === 'off') && (
          <button className="switch" role="switch" aria-checked={state === 'on'} aria-label="Notifications on this device" disabled={pending} onClick={state === 'on' ? disable : enable} />
        )}
      </div>
      {state === 'on' && (
        <button className="set-row" onClick={test} disabled={pending}>
          <span className="tile" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Icon name="send" />
          </span>
          <div className="mid">
            <b>Send a test notification</b>
          </div>
          <span className="val">
            <Icon name={pending ? 'loader' : 'chevron-right'} />
          </span>
        </button>
      )}
    </>
  )
}
