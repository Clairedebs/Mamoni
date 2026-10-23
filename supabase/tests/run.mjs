// Runs every *.test.mjs in this folder: `npm run test:db`.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
let failed = 0
for (const f of readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort()) {
  console.log(`\n${f}`)
  const r = spawnSync(process.execPath, [dir + f], { stdio: 'inherit' })
  if (r.status !== 0) failed++
}
console.log(failed ? `\n${failed} database test file(s) failed` : '\nAll database tests passed')
process.exit(failed ? 1 : 0)
