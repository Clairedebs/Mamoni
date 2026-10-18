'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, createContext, useCallback, useContext, useState } from 'react'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import type { TransactionKind } from '@/lib/types'

export type SheetRequest = { kind: TransactionKind; categoryId?: string; potId?: string; nonce: number }
const SheetCtx = createContext<{ req: SheetRequest | null; open: (r?: Omit<SheetRequest, 'nonce'>) => void; close: () => void }>({
  req: null,
  open: () => {},
  close: () => {},
})
export const useAddSheet = () => useContext(SheetCtx)

const NAV = [
  { href: '/', label: 'Home', icon: 'house' },
  { href: '/activity', label: 'Activity', icon: 'arrow-left-right' },
  { href: '/savings', label: 'Savings', icon: 'piggy-bank' },
  { href: '/settings', label: 'Settings', icon: 'settings-2' },
]

export function AppShell({ children, sheet }: { children: React.ReactNode; sheet: React.ReactNode }) {
  const [req, setReq] = useState<SheetRequest | null>(null)
  const open = useCallback((r?: Omit<SheetRequest, 'nonce'>) => setReq({ kind: 'expense', ...r, nonce: Date.now() }), [])
  const close = useCallback(() => setReq(null), [])

  return (
    <SheetCtx.Provider value={{ req, open, close }}>
      <div className="app">
        <aside className="rail" aria-label="Main navigation">
          <div className="brand">
            <svg className="appicon" aria-hidden="true">
              <use href="#logo" />
            </svg>
            Ma moni
          </div>
          <button className="btn add" onClick={() => open()}>
            <Icon name="plus" />
            Add
          </button>
          <Suspense fallback={<NavLinks items={NAV} cls="nav" path={null} />}>
            <ActiveNav items={NAV} cls="nav" />
          </Suspense>
          <div className="spacer" />
          <ThemeToggle variant="nav" />
        </aside>

        <main id="main">{children}</main>

        <nav className="tabbar" aria-label="Navigation">
          <Suspense fallback={<NavLinks items={NAV.slice(0, 2)} cls="tab" path={null} />}>
            <ActiveNav items={NAV.slice(0, 2)} cls="tab" />
          </Suspense>
          <button className="fab" onClick={() => open()} aria-label="Add a transaction">
            <Icon name="plus" />
          </button>
          <Suspense fallback={<NavLinks items={NAV.slice(2)} cls="tab" path={null} />}>
            <ActiveNav items={NAV.slice(2)} cls="tab" />
          </Suspense>
        </nav>
      </div>
      {sheet}
    </SheetCtx.Provider>
  )
}

type NavItem = (typeof NAV)[number]

function NavLinks({ items, cls, path }: { items: NavItem[]; cls: string; path: string | null }) {
  const active = (href: string) => path !== null && (href === '/' ? path === '/' : path.startsWith(href))
  return items.map((n) => (
    <Link key={n.href} href={n.href} className={cls} aria-current={active(n.href) ? 'page' : undefined}>
      <Icon name={n.icon} />
      {n.label}
    </Link>
  ))
}

function ActiveNav({ items, cls }: { items: NavItem[]; cls: string }) {
  return <NavLinks items={items} cls={cls} path={usePathname()} />
}

/** Any button that opens the add sheet (e.g. "Update now", "Deposit"). */
export function AddButton({ className, children, kind, potId, ...rest }: { className?: string; children: React.ReactNode; kind?: TransactionKind; potId?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open } = useAddSheet()
  return (
    <button className={className} onClick={() => open({ kind: kind ?? 'expense', potId })} {...rest}>
      {children}
    </button>
  )
}
