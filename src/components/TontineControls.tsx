'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { useToast } from './Toast'
import { endTontineCycle, setTontineReminders } from '@/lib/tontine-actions'

export function RemindersSwitch({ id, enabled }: { id: string; enabled: boolean }) {
  const toast = useToast()
  const [on, setOn] = useState(enabled)
  const [, start] = useTransition()
  return (
    <button
      className="switch"
      role="switch"
      aria-checked={on}
      aria-label="Reminders for this group"
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
  if (!confirm)
    return (
      <button className="btn-danger" onClick={() => setConfirm(true)}>
        <Icon name="flag" />
        End cycle
      </button>
    )
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="hint" role="alert">
        End this cycle? Reminders stop and it moves to Past cycles.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn ghost" onClick={() => setConfirm(false)}>
          Cancel
        </button>
        <button
          className="btn"
          style={{ background: 'var(--neg)' }}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await endTontineCycle(id)
              if (!res.ok) return toast(res.error)
              toast('Cycle ended')
              router.push('/tontines')
            })
          }
        >
          <Icon name={pending ? 'loader' : 'flag'} />
          End cycle
        </button>
      </div>
    </div>
  )
}
