// Shared setup for database tests: an in-memory Postgres (PGlite) with a stub of Supabase's auth schema.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const MIGRATIONS = fileURLToPath(new URL('../migrations/', import.meta.url))

export async function freshDb(files) {
  const db = new PGlite()
  await db.exec(`create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
create role authenticated; create role anon;`)
  for (const f of files) await applyMigration(db, f)
  return db
}

export const applyMigration = (db, f) => db.exec(readFileSync(MIGRATIONS + f, 'utf8'))

export async function newUser(db, uid) {
  await db.exec(`insert into auth.users (id) values ('${uid}'); set app.uid = '${uid}';`)
}

export function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` — ${JSON.stringify(detail)}`}`)
  if (!ok) process.exitCode = 1
}
