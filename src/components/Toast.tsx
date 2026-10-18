'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

type ToastItem = { id: number; msg: string; undo?: () => void; leaving?: boolean }
const Ctx = createContext<(msg: string, undo?: () => void) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<ToastItem | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const dismiss = useCallback(() => {
    setT((cur) => (cur ? { ...cur, leaving: true } : cur))
    setTimeout(() => setT((cur) => (cur?.leaving ? null : cur)), 200)
  }, [])

  const show = useCallback(
    (msg: string, undo?: () => void) => {
      clearTimeout(timer.current)
      setT({ id: Date.now(), msg, undo })
      timer.current = setTimeout(dismiss, 4200)
    },
    [dismiss],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div key={t.id} className={`toast${t.leaving ? ' out' : ''}`} role="status">
          <Icon name="circle-check" />
          <span>{t.msg}</span>
          {t.undo && (
            <button
              onClick={() => {
                t.undo?.()
                dismiss()
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  )
}
