import { applyMigration, check, freshDb, newUser } from './helpers.mjs'

const db = await freshDb(['20261018000000_init.sql', '20261019000000_tontine_groups.sql', '20261021000000_transaction_edits.sql', '20261023000000_currency.sql', '20261025000000_onboarding.sql'])
await newUser(db, '77777777-7777-7777-7777-777777777777')

await applyMigration(db, '20261027000000_language.sql')

const existing = (await db.query(`select language from public.profiles where id='77777777-7777-7777-7777-777777777777'`)).rows[0]
check('existing accounts stay in English', existing.language === 'en', existing)

await db.exec(`update public.profiles set language='fr' where id='77777777-7777-7777-7777-777777777777'`)
const switched = (await db.query(`select language from public.profiles where id='77777777-7777-7777-7777-777777777777'`)).rows[0]
check('French can be chosen', switched.language === 'fr', switched)

let refused = false
try {
  await db.exec(`update public.profiles set language='de' where id='77777777-7777-7777-7777-777777777777'`)
} catch {
  refused = true
}
check('unknown languages are refused', refused)
