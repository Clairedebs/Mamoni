import { applyMigration, check, freshDb, newUser } from './helpers.mjs'

const db = await freshDb(['20261018000000_init.sql', '20261019000000_tontine_groups.sql', '20261021000000_transaction_edits.sql', '20261023000000_currency.sql'])
await newUser(db, '55555555-5555-5555-5555-555555555555')

await applyMigration(db, '20261025000000_onboarding.sql')

const existing = (await db.query(`select onboarded_at from public.profiles where id='55555555-5555-5555-5555-555555555555'`)).rows[0]
check('existing accounts count as onboarded', existing.onboarded_at !== null, existing)

await db.exec(`insert into auth.users (id) values ('66666666-6666-6666-6666-666666666666')`)
const fresh = (await db.query(`select onboarded_at from public.profiles where id='66666666-6666-6666-6666-666666666666'`)).rows[0]
check('new accounts start without onboarding', fresh.onboarded_at === null, fresh)
