'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { useT } from './i18n'
import { endTontineCycle, setTontineReminders } from '@/lib/tontine-actions'

export function RemindersSwitch({ id, enabled }: { id: string; enabled: boolean }) {
  const toast = useToast()
  const [on, setOn] = useState(enabled)
  const [, start] = useTransition()
  const t = useT().tontine
  return (
    <button
      className="switch"
      role="switch"
      aria-checked={on}
      aria-label={t.remindersAria}
      onClick={() => {
        setOn(!on)
        start(async () => {
          const res = await setTontineReminders(id, !on)
          if (!res.ok) {
            setOn(on)
            toast(res.error)
          }
        })
      }}
    />
  )
}

export function EndCycle({ id }: { id: string }) {
  const router = useRouter()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const m = useT()
  const t = m.tontine
  if (!confirm)
    return (
      <button className="btn-danger" onClick={() => setConfirm(true)}>
        <Icon name="flag" />
        {t.endCycle}
      </button>
    )
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="hint" role="alert">
        {t.endConfirm}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn ghost" onClick={() => setConfirm(false)}>
          {m.common.cancel}
        </button>
        <button
          className="btn"
          style={{ background: 'var(--neg)' }}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await endTontineCycle(id)
              if (!res.ok) return toast(res.error)
              toast(t.ended)
              router.push('/tontines')
            })
          }
        >
          <Icon name={pending ? 'loader' : 'flag'} />
          {t.endCycle}
        </button>
      </div>
    </div>
  )
}
