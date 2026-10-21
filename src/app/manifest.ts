import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Moni yem',
    short_name: 'Moni yem',
    description: 'Track your spending, income and savings — tontines included.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f5f9',
    theme_color: '#9518ad',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: 'Activity', url: '/activity', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Savings', url: '/savings', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
