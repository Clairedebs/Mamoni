import { check, freshDb, newUser } from './helpers.mjs'

const db = await freshDb(['20261018000000_init.sql', '20261019000000_tontine_groups.sql', '20261021000000_transaction_edits.sql', '20261023000000_currency.sql'])
const uid = '33333333-3333-3333-3333-333333333333'
await newUser(db, uid)
const gid = (await db.query(`insert into public.tontine_groups (user_id, name, amount_per_name, names_total, names_held, frequency, cycle_start, cycle_end, first_due, anchor_day)
 values ('${uid}', 'Friday tontine', 2500, 20, 2, 'weekly', '2026-09-05', '2027-01-16', '2026-10-24', 24) returning id`)).rows[0].id
const tid = (await db.query(`insert into public.tontine_turns (user_id, group_id, turn_on, expected_amount) values ('${uid}', '${gid}', '2026-10-17', 50000) returning id`)).rows[0].id
const bank = (await db.query(`select id from public.categories where kind='saving' and name='Bank'`)).rows[0].id
const pot = (await db.query(`insert into public.pots (user_id, category_id, name) values ('${uid}', '${bank}', 'Savings account') returning id`)).rows[0].id
const income = (await db.query(`select public.collect_payout('${tid}', 50000, '2026-10-17', '${pot}', 40000) as id`)).rows[0].id
const linked = (await db.query(`select count(*)::int n from public.transactions where linked_to = '${income}'`)).rows[0].n
await db.exec(`delete from public.transactions where id = '${income}'`)
const turn = (await db.query(`select status, transaction_id from public.tontine_turns where id='${tid}'`)).rows[0]
const left = (await db.query(`select count(*)::int n from public.transactions`)).rows[0].n
check('deleting a payout reopens the turn and removes its savings deposit', linked === 1 && turn.status === 'upcoming' && turn.transaction_id === null && left === 0, { linked, turn, left })
