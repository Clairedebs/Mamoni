import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import { InlineScript } from '@/components/InlineScript'
import { LangProvider } from '@/components/i18n'
import { THEME_SCRIPT } from '@/components/theme'
import { CURRENCY_SCRIPT } from '@/lib/currencies'
import { LANGS } from '@/lib/i18n'
import { getLang, getT } from '@/lib/i18n/server'
import { Providers } from '@/components/Providers'
import '../globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: { default: 'Moni yem', template: '%s · Moni yem' },
    description: t.meta.description,
    applicationName: 'Moni yem',
    appleWebApp: { capable: true, title: 'Moni yem', statusBarStyle: 'default' },
    icons: { icon: '/icons/icon.svg', apple: '/icons/apple-touch-icon.png' },
    formatDetection: { telephone: false },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#110b13' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang()
  return (
    <html lang={lang} className={manrope.variable} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT + CURRENCY_SCRIPT} />
      </head>
      <body>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <symbol id="logo" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="16" fill="#9518ad" />
              <path d="M17 36c0-9.4 7.2-16 16.5-16 6 0 10.6 2.5 13.3 6.3l3.6-1.2-1 5.4c.4 1.3.6 2.7.6 4.1 0 5.3-3 9.4-7 11.6V51h-6v-3.3c-1.1.2-2.3.3-3.5.3s-2.4-.1-3.5-.3V51h-6v-5.2C19.7 43.5 17 40 17 36Z" fill="#fff" />
              <rect x="27" y="25" width="11" height="3" rx="1.5" fill="#9518ad" />
              <circle cx="42.5" cy="33" r="2" fill="#9518ad" />
            </symbol>
          </defs>
        </svg>
        <LangProvider lang={lang}>
          <Providers>{children}</Providers>
        </LangProvider>
      </body>
    </html>
  )
}
