# Moni yem

A personal finance PWA for spending, income and savings, with tontines included. Built with Next.js 16 (App Router, Cache Components) and Supabase. One currency per account (FCFA by default; EUR, USD, NGN and more in Settings).

## What's inside

- **Home**: net worth, available cash, income and spending this month, a 6-month chart, top spending categories, a savings breakdown, and recent activity.
- **Activity**: browse by month, filter by spending, income or savings, and search.
- **Savings**: categories (Contributions, Bank, Family, plus your own) that hold *pots*. Each pot has a starting balance and an optional goal.
- **Tontines**: track rotating contribution groups. Set the amount per name, number of names, names you hold, weekly or monthly deadline, and your turns. Moni yem shows "covered until" as you pay ahead, flags late weeks, and on your turn records the payout as income and can move part of it into savings. Contributions count as spending.
- **Add sheet**: a keypad, a custom date picker (defaults to today), expenses, income, and savings deposits or withdrawals. Saving shows an Undo toast.
- **Transaction detail**: tap any transaction to see it, edit its amount, category or pot, date and note, or delete it (with Undo).
- **Categories**: create or edit spending, income and savings categories with an icon and a colour from a fixed palette.
- **Reminders** (web push): a daily or weekly check-in at the time you choose, a nudge after 2 days with no entries, and for each tontine: the evening before an unpaid deadline, once if a payment is missed, and on your turn.
- **Welcome tour**: new accounts see 4 short screens (balance, logging, savings pots, tontines), then pick their currency and time zone and enter starting balances. Replay it from Settings › Help.
- **PWA**: installable, works with light and dark mode, and shows an offline fallback page. Full offline entry with sync is planned for v2.

## 1. Create the database

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migrations in order:
   1. `supabase/migrations/20261018000000_init.sql`: tables, row-level security (each user only sees their own rows) and default categories.
   2. `supabase/migrations/20261019000000_tontine_groups.sql`: tontine groups and turns, the Tontine / Tontine payout categories, and the payout function.
   3. `supabase/migrations/20261021000000_transaction_edits.sql`: links a payout's savings deposit to the payout, and reopens the turn when a payout is deleted.
   4. `supabase/migrations/20261023000000_currency.sql`: amounts keep cents, and the account currency is checked against the supported list.
   5. `supabase/migrations/20261025000000_onboarding.sql`: remembers who finished the welcome tour (existing accounts are marked done).
3. In **Authentication › URL Configuration**:
   - set **Site URL** to `http://localhost:3000` (later, your production URL);
   - add `http://localhost:3000/auth/callback` to **Redirect URLs** (and the production equivalent).

## 2. Configure the app

`.env.local` already contains freshly generated VAPID keys and a `CRON_SECRET`. Add your Supabase values (Project Settings › API):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...   # server only, used by the reminder job
```

`.env.local` is git-ignored. `.env.example` lists every variable.

## 3. Run it

```bash
npm install
npm run dev
```

Run the unit tests (tontine maths, reminders, currencies) with `npm test`, and the database tests (migrations in an in-memory Postgres) with `npm run test:db`.

Open http://localhost:3000, create an account, then enter your starting balances.

Push notifications need HTTPS. To test them locally, run `npx next dev --experimental-https`, then go to **Settings › Notifications on this device**.

## 4. Reminders in production

`GET /api/cron/reminders` (with `Authorization: Bearer $CRON_SECRET`) sends any reminders that are due. Call it every 15 minutes:

- **Supabase (free)**: enable `pg_cron` and `pg_net`, then run `supabase/cron.sql` with your URL and secret filled in.
- **Vercel Cron**: also works, but the Hobby plan only allows daily jobs.

## 5. Deploy

Deploy to Vercel (or any Node host) and set the same environment variables there. Then add the production URL to Supabase's Site URL and Redirect URLs.

## Project map

```
src/app/(app)/        signed-in screens (home, activity, savings, tontines, settings, categories)
src/app/login/        sign in / sign up
src/app/api/cron/     reminder job
src/components/       shell, add sheet, pickers, forms, charts
src/lib/              Supabase clients, data queries, server actions, formatting
src/lib/tontine.ts    tontine coverage maths and reminder rules (unit-tested)
src/proxy.ts          session refresh + auth redirect (Next 16 "proxy", formerly middleware)
public/sw.js          service worker (caching, push, notification clicks)
supabase/             SQL migration and cron schedule
scripts/make-icons.mjs regenerates the PWA icons from the logo
```

The design system is documented in `DESIGN.md`. The original clickable prototype is in `maquette/index.html`.
