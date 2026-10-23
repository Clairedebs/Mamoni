import { applyMigration, check, freshDb, newUser } from './helpers.mjs'

const db = await freshDb(['20261018000000_init.sql', '20261019000000_tontine_groups.sql', '20261021000000_transaction_edits.sql'])
const uid = '44444444-4444-4444-4444-444444444444'
await newUser(db, uid)
const groc = (await db.query(`select id from public.categories where name='Groceries'`)).rows[0].id
await db.exec(`insert into public.transactions (user_id, kind, amount, category_id, occurred_on) values ('${uid}','expense',12500,'${groc}','2026-10-20')`)

await applyMigration(db, '20261023000000_currency.sql')

await db.exec(`insert into public.transactions (user_id, kind, amount, category_id, occurred_on) values ('${uid}','expense',12.5,'${groc}','2026-10-21')`)
const amounts = (await db.query(`select amount::text a from public.transactions order by occurred_on`)).rows.map((r) => r.a)
check('existing whole amounts are unchanged and new amounts keep cents', amounts[0] === '12500.00' && amounts[1] === '12.50', amounts)

const gid = (await db.query(`insert into public.tontine_groups (user_id, name, amount_per_name, names_total, names_held, frequency, cycle_start, cycle_end, first_due, anchor_day)
 values ('${uid}', 'Club', 2.5, 10, 1, 'weekly', '2026-09-05', '2026-11-07', '2026-10-24', 24) returning id`)).rows[0].id
const tid = (await db.query(`insert into public.tontine_turns (user_id, group_id, turn_on, expected_amount) values ('${uid}', '${gid}', '2026-10-17', 25) returning id`)).rows[0].id
await db.query(`select public.collect_payout('${tid}', 24.75, '2026-10-17')`)
const payout = (await db.query(`select amount::text a from public.transactions where kind='income'`)).rows[0].a
check('payouts accept cents', payout === '24.75', payout)

const bal = (await db.query(`select balance::text b from public.pot_balances`)).rows
check('pot balances view still works', Array.isArray(bal), bal)

let rejected = false
try { await db.exec(`update public.profiles set currency='ZZZ' where id='${uid}'`) } catch { rejected = true }
await db.exec(`update public.profiles set currency='EUR' where id='${uid}'`)
check('only known currencies are accepted', rejected, { rejected })

let tooPrecise = false
try { await db.exec(`insert into public.transactions (user_id, kind, amount, category_id, occurred_on) values ('${uid}','expense',1.234,'${groc}','2026-10-21')`) } catch { tooPrecise = true }
const stored = (await db.query(`select count(*)::int n from public.transactions where amount = 1.23`)).rows[0].n
check('amounts are kept to the cent', tooPrecise || stored === 1, { tooPrecise, stored })
