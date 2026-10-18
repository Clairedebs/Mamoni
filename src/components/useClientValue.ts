import { useSyncExternalStore } from 'react'

/** Reads a browser-only value without an effect; `server` is used during SSR and hydration. */
export function useClientValue<T>(read: () => T, server: T, subscribe: (cb: () => void) => () => void = () => () => {}) {
  return useSyncExternalStore(subscribe, read, () => server)
}
