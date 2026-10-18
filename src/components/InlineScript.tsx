/** Runs a script synchronously during HTML parsing (before first paint) without React warnings on hydration. */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
