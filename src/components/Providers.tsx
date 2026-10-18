'use client'

import { useEffect } from 'react'
import { ToastProvider } from './Toast'
import { PickerProvider } from './Pickers'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
    }
  }, [])
  return (
    <ToastProvider>
      <PickerProvider>{children}</PickerProvider>
    </ToastProvider>
  )
}
