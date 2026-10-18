// Renders the PWA icon set from the logo mark. Run: node scripts/make-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const MARK = `<path d="M17 36c0-9.4 7.2-16 16.5-16 6 0 10.6 2.5 13.3 6.3l3.6-1.2-1 5.4c.4 1.3.6 2.7.6 4.1 0 5.3-3 9.4-7 11.6V51h-6v-3.3c-1.1.2-2.3.3-3.5.3s-2.4-.1-3.5-.3V51h-6v-5.2C19.7 43.5 17 40 17 36Z" fill="#fff"/><rect x="27" y="25" width="11" height="3" rx="1.5" fill="#9518ad"/><circle cx="42.5" cy="33" r="2" fill="#9518ad"/>`
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#9518ad"/>${MARK}</svg>`
// Full-bleed square with the mark inside the 80% safe zone, for Android adaptive icons.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#9518ad"/><g transform="translate(6.4 6.4) scale(.8)">${MARK}</g></svg>`
// Opaque square for iOS, which rounds corners itself.
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#9518ad"/><g transform="translate(3.2 3.2) scale(.9)">${MARK}</g></svg>`
// Monochrome silhouette for the Android notification badge.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="12 14 44 42"><path d="M17 36c0-9.4 7.2-16 16.5-16 6 0 10.6 2.5 13.3 6.3l3.6-1.2-1 5.4c.4 1.3.6 2.7.6 4.1 0 5.3-3 9.4-7 11.6V51h-6v-3.3c-1.1.2-2.3.3-3.5.3s-2.4-.1-3.5-.3V51h-6v-5.2C19.7 43.5 17 40 17 36Z" fill="#fff"/></svg>`

await mkdir('public/icons', { recursive: true })
const out = (svg, size, file) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(`public/icons/${file}`)
await Promise.all([
  out(rounded, 192, 'icon-192.png'),
  out(rounded, 512, 'icon-512.png'),
  out(maskable, 512, 'icon-maskable-512.png'),
  out(apple, 180, 'apple-touch-icon.png'),
  out(badge, 96, 'badge-96.png'),
  out(rounded, 48, 'favicon-48.png'),
])
console.log('icons written')
