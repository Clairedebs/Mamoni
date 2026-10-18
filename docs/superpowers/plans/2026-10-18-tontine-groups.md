# Tontine Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user track rotating contribution groups (tontines) as a light layer on her budget: "covered until" per group, turns collected as income with an optional move to savings, quiet reminders, and cycle end.

**Architecture:** A pure coverage module (`src/lib/tontine.ts`, unit-tested with Vitest) computes deadlines, coverage, credit and arrears from a group's schedule and the sum of its payments. Postgres stores groups and turns (RLS like every other table); contributions are ordinary expense transactions and payouts ordinary income transactions, linked by `group_id`. Screens live under `/tontines`; Home shows one status line per active group; the existing add sheet and reminder job are extended.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components, server actions, `refresh()`), React 19, Supabase (Postgres + RLS), lucide-react, web-push, Vitest (new, dev only).

**Spec:** `docs/superpowers/specs/2026-10-18-tontine-groups-design.md`

## Global Constraints

- Contributions = **spending** (expense transactions); payouts = **income**; moving to savings = a normal **deposit** into a savings pot. A group holds no balance.
- Nothing before the app is backfilled; turns marked "collected before the app" are never income.
- Deadline time defaults to **18:00**; weekly deadlines repeat every 7 days from "my next due date"; monthly deadlines keep the day of month of "my next due date", clamped to month end.
- Contribution per period = amount per name × names held. Payout per turn = amount per name × number of names. Estimated cycle end = cycle start + (number of names − 1) periods, user-editable.
- Payments fill the **oldest uncovered deadline first**. A deadline is missed only after its date **and** deadline time pass in the user's time zone (`profiles.timezone`).
- Reminders: payment-due the day before the next uncovered deadline at the user's reminder time, never while paid ahead; turn day in the morning; behind once per missed deadline the morning after, never daily; per-group mute.
- Mid-cycle edits to amount, names held, number of names or frequency apply from the next uncovered deadline; past coverage is not recomputed.
- Credit left at cycle end is shown in past-cycle totals; "Start a new round" offers to carry it (on by default).
- UI follows `DESIGN.md`: English copy, FCFA whole numbers with comma grouping, custom date/time pickers (`usePickers`), chips, sheets, `--pal-*` tokens. No native date/time inputs.
- Next 16 + Cache Components: dynamic reads inside `<Suspense>`; call `connection()` (via `getToday()`) before any clock read in server code.
- New SQL in a new migration file the user runs in the Supabase SQL editor. Delete the unapplied draft `supabase/migrations/20261019000000_tontines.sql`.
- Leave the uncommitted greeting change (`src/components/Greeting.tsx`, `src/app/(app)/page.tsx`, `src/lib/format.ts`) as is unless a task edits those files; commit it with Task 1 so later diffs stay clean.

## Review Focus

- **Next due date already in the past at setup** (user enters last Friday): the group must show "1 week late · 5,000 due" right away, not "covered". → Task 2 test `behind when first deadline already passed`.
- **Monthly group due on the 31st**: February's deadline must be Feb 28/29, and March's back on the 31st. → Task 2 test `monthly deadlines clamp to month end and recover`.
- **Payment logged on deadline day before 18:00 vs after**: before 18:00 the group is on time; after 18:00 with nothing paid it is 1 late. → Task 2 test `deadline day counts until deadline time`.
- **Overpaying past the cycle end**: shows "Fully paid for this cycle" and keeps the surplus as credit. → Task 2 test `overpayment beyond cycle end becomes extra credit`.
- **Editing the amount mid-cycle** after paying 4 weeks ahead: the 4 covered weeks stay covered at the old amount; new amount applies after. → Task 2 test `rebase keeps covered deadlines and credit`.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/tontine.ts` (new) | Pure maths: deadlines, coverage, status label, rebase, cycle-end estimate, payout validation |
| `src/lib/tontine.test.ts` (new) | Vitest unit tests for the above |
| `vitest.config.ts` (new) | Vitest with `@/` alias |
| `supabase/migrations/20261019000000_tontine_groups.sql` (new; replaces the draft) | Tables, RLS, category roles, `collect_payout` RPC, new-user trigger |
| `src/lib/types.ts` | `TontineGroup`, `TontineTurn`, `Category.role`, `Transaction.group_id` |
| `src/lib/data.ts` | `getTontineGroups`, `getTontineGroup`, group payment sums |
| `src/lib/tontine-actions.ts` (new) | Server actions for groups, turns, payouts, cycle end |
| `src/lib/actions.ts` | `addTransaction` accepts `groupId`; remove `updatePotSchedule` |
| `src/components/TontineForm.tsx` (new) | Create / edit / new-round form |
| `src/components/TontineStatusLine.tsx` (new) | One-line status used on Home and in the list |
| `src/components/CollectPayoutSheet.tsx` (new) | Collect payout form in a sheet |
| `src/app/(app)/tontines/page.tsx` (new) | Active groups + Past cycles |
| `src/app/(app)/tontines/new/page.tsx` (new) | New group / new round (`?from=<id>`) |
| `src/app/(app)/tontines/[id]/page.tsx` (new) | Group page |
| `src/app/(app)/tontines/[id]/edit/page.tsx` (new) | Edit group |
| `src/app/(app)/page.tsx`, `savings/page.tsx` | Home status lines, entry links |
| `src/components/AddSheet.tsx`, `src/app/(app)/layout.tsx` | Group selector + amount shortcuts for the Tontine category |
| `src/app/api/cron/reminders/route.ts` | Tontine reminders; remove pot due-date roll-forward |
| `src/components/PotForm.tsx`, `SettingsForm.tsx`, `savings/[id]/page.tsx`, `settings/page.tsx` | Remove superseded contribution-day UI |

---

### Task 1: Remove the superseded contribution-day pieces

**Files:**
- Delete: `supabase/migrations/20261019000000_tontines.sql`
- Modify: `src/components/PotForm.tsx` (drop the "Contribution schedule" section and `dueDate`/`repeat` state), `src/app/(app)/savings/[id]/page.tsx` (drop the "Next contribution …" line), `src/components/SettingsForm.tsx` (drop the "Contribution day" row, its `sub-opts` block and the `schedule` helper; drop `contributionPots` prop), `src/app/(app)/settings/page.tsx` (stop computing `contributionPots`), `src/lib/actions.ts` (delete `updatePotSchedule`; `savePot` stops sending `due_date`/`repeat`), `src/app/api/cron/reminders/route.ts` (delete the pot roll-forward/announce loop; keep daily reminder and nudge).

**Interfaces:**
- Produces: `savePot(input: { id?; categoryId; name; note?; initialAmount; startedOn; goalAmount? })` (no schedule fields). DB columns `pots.due_date/repeat` and `profiles.contribution_*` stay but are unused.

- [ ] **Step 1:** Commit the pending greeting change on its own: `git add src/components/Greeting.tsx "src/app/(app)/page.tsx" src/lib/format.ts && git commit -m "feat: greeting follows the device's hour"`.
- [ ] **Step 2:** Make the removals listed above.
- [ ] **Step 3:** Verify: `npx eslint src && npx tsc --noEmit` → no output; `npx next build` → "Compiled successfully" and 18/18 pages. `grep -rn "updatePotSchedule\|contributionPots\|Contribution schedule" src` → no matches.
- [ ] **Step 4:** Commit: `git commit -am "refactor: remove pot contribution schedule superseded by tontine groups"` (include the deleted draft migration).

---

### Task 2: Coverage maths (pure, TDD)

**Files:**
- Create: `vitest.config.ts`, `src/lib/tontine.ts`, `src/lib/tontine.test.ts`
- Modify: `package.json` (`"test": "vitest run"`; dev dependency `vitest`)

**Interfaces:**
- Produces (all in `src/lib/tontine.ts`, dates are `YYYY-MM-DD` strings, money is integer FCFA):
  - `type Frequency = 'weekly' | 'monthly'`
  - `addPeriods(iso: string, frequency: Frequency, n: number, anchorDay?: number): string` — monthly keeps `anchorDay` (default: day of `iso`), clamped to month end.
  - `deadlines(firstDue: string, cycleEnd: string, frequency: Frequency, anchorDay?: number): string[]` — inclusive of `cycleEnd` when it lands on a deadline; monthly steps keep `anchorDay` so a rebased Feb 28 start still returns to the 31st.
  - `estimateCycleEnd(cycleStart: string, namesTotal: number, frequency: Frequency): string` = `addPeriods(cycleStart, f, namesTotal - 1)`.
  - `type Coverage = { perPeriod: number; coveredUntil: string | null; nextDue: string | null; nextDueAmount: number; credit: number; behindCount: number; behindAmount: number; fullyPaid: boolean; extraCredit: number; missedDeadlines: string[] }`
  - `coverage(input: { firstDue: string; anchorDay?: number; cycleEnd: string; frequency: Frequency; perPeriod: number; paid: number; openingCredit: number; today: string; nowMinutes: number; deadlineMinutes: number }): Coverage` — `paid + openingCredit` fills deadlines oldest first; a deadline is missed when `d < today` or (`d === today` and `nowMinutes >= deadlineMinutes`) and it is not fully covered. `behindAmount` = missed deadlines × perPeriod − credit. `extraCredit` = money left after the last deadline is covered.
  - `type GroupStatus = { tone: 'ok' | 'soon' | 'late' | 'turn' | 'done'; text: string }`
  - `statusLine(c: Coverage, opts: { today: string; turnToday: boolean; label: (iso: string) => string }): GroupStatus` — precedence: turn today → "Your turn today"; late → "`n` week(s)|month(s) late · `x` FCFA due"; fullyPaid → "Fully paid for this cycle"; next due is tomorrow → "`x` FCFA due tomorrow"; else "Covered until `label(coveredUntil)`", or "Due `label(nextDue)`" when nothing covered yet.
  - `rebase(c: Coverage): { firstDue: string; openingCredit: number }` — the next uncovered deadline (oldest missed if behind) and the current credit; used when editing a group mid-cycle (payments so far are then excluded via `paymentsOffset`, Task 4).
  - `validatePayout(amount: number, saveAmount: number): string | null` — `'Enter the payout amount.'` when amount ≤ 0; `'You can move at most the payout amount.'` when saveAmount < 0 or > amount; else null.

- [ ] **Step 1: Write the failing tests** in `src/lib/tontine.test.ts` (Vitest `describe/it/expect`). Base case `W = { firstDue: '2026-10-24', cycleEnd: '2027-01-16', frequency: 'weekly', perPeriod: 5000, openingCredit: 0, deadlineMinutes: 1080 }`:
  - `paid 20000 → coveredUntil '2026-11-14', nextDue '2026-11-21', nextDueAmount 5000, credit 0` (today '2026-10-22', nowMinutes 600).
  - `paid 12000 → coveredUntil '2026-10-31', credit 2000, nextDueAmount 3000`.
  - `behind when first deadline already passed`: today '2026-10-27', paid 0 → behindCount 1, behindAmount 5000, coveredUntil null.
  - `deadline day counts until deadline time`: today '2026-10-24', paid 0 → nowMinutes 1079 ⇒ behindCount 0; nowMinutes 1080 ⇒ behindCount 1.
  - `late payment fills oldest first`: today '2026-11-02' (two missed), paid 5000 → behindCount 1, coveredUntil '2026-10-24'.
  - `overpayment beyond cycle end becomes extra credit`: paid = 13 × 5000 + 7000 with cycleEnd '2027-01-16' (13 deadlines) → fullyPaid true, extraCredit 7000, nextDue null.
  - `monthly deadlines clamp to month end and recover`: `deadlines('2027-01-31','2027-04-30','monthly')` → `['2027-01-31','2027-02-28','2027-03-31','2027-04-30']`.
  - `estimateCycleEnd('2026-09-05', 20, 'weekly')` → `'2027-01-16'`.
  - `rebase keeps covered deadlines and credit`: from W with paid 22000, today '2026-10-22' → `{ firstDue: '2026-11-21', openingCredit: 2000 }`; behind case (today '2026-11-02', paid 0) → `firstDue '2026-10-24'`.
  - `statusLine`: covered → `{ tone: 'ok', text: 'Covered until Fri, Nov 14' }` with `label = shortDate`; next due tomorrow → `{ tone: 'soon', text: '5,000 FCFA due tomorrow' }`; late → `{ tone: 'late', text: '1 week late · 5,000 FCFA due' }`; turnToday wins over late.
  - `validatePayout(50000, 60000)` → `'You can move at most the payout amount.'`; `validatePayout(0, 0)` → `'Enter the payout amount.'`; `validatePayout(50000, 50000)` → null.
- [ ] **Step 2:** Install and wire: `npm i -D vitest`, `vitest.config.ts` with `resolve.alias['@'] = path.resolve(__dirname, 'src')`, script `"test": "vitest run"`. Run `npx vitest run src/lib/tontine.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `src/lib/tontine.ts` with the signatures above (reuse `addDays`, `parseIso`, `isoOf`, `fmt`, `shortDate` from `src/lib/format.ts`).
- [ ] **Step 4:** `npx vitest run` → all PASS.
- [ ] **Step 5:** Commit: `git add vitest.config.ts package.json package-lock.json src/lib/tontine.ts src/lib/tontine.test.ts && git commit -m "feat: tontine coverage maths with tests"`.

---

### Task 3: Database migration and types

**Files:**
- Create: `supabase/migrations/20261019000000_tontine_groups.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces (SQL):
  - `categories.role text null check (role in ('tontine','tontine_payout'))`; insert for every existing profile, when missing, an expense category `('Tontine','hand-coins','amber', role 'tontine')` and an income category `('Tontine payout','hand-coins','amber', role 'tontine_payout')`; `handle_new_user()` recreated to add both and to give "Contributions" the description `'Mutual funds and group savings'`.
  - `tontine_groups(id uuid pk, user_id uuid default auth.uid(), name text 1–32, amount_per_name bigint > 0, names_total smallint 2–200, names_held smallint ≥ 1 and ≤ names_total, frequency text in ('weekly','monthly'), deadline_time time default '18:00', cycle_start date, cycle_end date ≥ cycle_start, first_due date, anchor_day smallint 1–31 (day of month of the original next due date; used for monthly groups), opening_credit bigint ≥ 0 default 0, payments_offset bigint ≥ 0 default 0, reminders_enabled bool default true, status text in ('active','ended') default 'active', ended_on date, last_due_reminder_for date, last_behind_reminder_for date, created_at, unique (id, user_id))`.
  - `tontine_turns(id uuid pk, user_id, group_id → tontine_groups (group_id, user_id) on delete cascade, turn_on date, expected_amount bigint > 0, status text in ('upcoming','collected','before_app') default 'upcoming', transaction_id uuid null references transactions on delete set null, notified_on date)`.
  - `transactions.group_id uuid null`, FK `(group_id, user_id) → tontine_groups (id, user_id) on delete restrict` (groups are ended, not deleted, once they have payments); check `group_id is null or kind in ('expense','income')`; index on `group_id`.
  - RLS enabled with the same "own rows" policy pattern as the init migration; grants to `authenticated`.
  - `collect_payout(p_turn_id uuid, p_amount bigint, p_occurred_on date, p_save_pot_id uuid default null, p_save_amount bigint default 0) returns uuid` (security invoker): validates like `validatePayout`, requires the turn to be `upcoming`, inserts income (category = user's `role = 'tontine_payout'` category, `group_id`, note `'Payout · ' || group name`), optional deposit (note `'From ' || group name || ' payout'`), sets turn `status = 'collected'`, `transaction_id`; returns the income id. Grant execute to `authenticated`.
- Produces (TS): `Category.role: 'tontine' | 'tontine_payout' | null`; `Transaction.group_id: string | null`; `TontineGroup` and `TontineTurn` mirroring the columns (dates as strings, `deadline_time` as `'HH:MM'`).

- [ ] **Step 1:** Write the migration. Keep it idempotent for the category inserts (`where not exists`).
- [ ] **Step 2:** Verify syntax with a throwaway Postgres if Docker is running (`docker run --rm -d -e POSTGRES_PASSWORD=x -p 54329:5432 postgres:17`, create stub `auth` schema with `auth.users(id uuid)` and `auth.uid()` returning null, run both migrations with `psql`) → no errors. If Docker isn't available, say so in the task report and ask the user to run it in the Supabase SQL editor before Task 4's manual checks.
- [ ] **Step 3:** Update `src/lib/types.ts`; select `role` in `getCategories` and `group_id` in `getTransactions`. `npx tsc --noEmit` → clean.
- [ ] **Step 4:** Commit: `git commit -m "feat(db): tontine groups, turns and payout RPC"`.

---

### Task 4: Data access and server actions

**Files:**
- Modify: `src/lib/data.ts`, `src/lib/actions.ts`
- Create: `src/lib/tontine-actions.ts`

**Interfaces:**
- Consumes: Task 2 module, Task 3 tables/types.
- Produces:
  - `getTontineGroups(): Promise<TontineView[]>` and `getTontineGroup(id: string): Promise<TontineView | null>` in `data.ts`, where `TontineView = { group: TontineGroup; turns: TontineTurn[]; paid: number; collected: number; coverage: Coverage; status: GroupStatus }`. `paid` = sum of the group's expense transactions minus `payments_offset`; `collected` = sum of its income transactions; coverage uses `getToday()`, the profile time zone's current minutes and `deadline_time`. Sorted: active first (late, turn, soon, ok), then ended by `ended_on` desc.
  - In `tontine-actions.ts` (`'use server'`, `Result<T>` shape from `actions.ts`, each ends with `refresh()`):
    - `saveTontineGroup(input: { id?: string; name: string; amountPerName: number; namesTotal: number; namesHeld: number; frequency: Frequency; deadlineTime: string; cycleStart: string; cycleEnd: string; firstDue: string; turns: { id?: string; turnOn: string; beforeApp: boolean }[]; openingCredit?: number }): Promise<Result<{ id: string }>>` — validates (`turns.length === namesHeld`, each turn within cycle, `firstDue ≥ cycleStart`); on edit, if amount/names/frequency changed, applies `rebase` from the current coverage and sets `payments_offset` to the group's current expense total. Turn expected amount = amountPerName × namesTotal, and editing amount or number of names updates every still-`upcoming` turn's expected amount. `anchor_day` is set from `firstDue` on create and kept on rebase.
    - `collectTontinePayout(input: { turnId: string; amount: number; occurredOn: string; savePotId?: string; saveAmount?: number }): Promise<Result<{ id: string }>>` — `validatePayout` first, then `rpc('collect_payout', …)`.
    - `endTontineCycle(id: string): Promise<Result>` — status `ended`, `ended_on = today`.
    - `setTontineReminders(id: string, enabled: boolean): Promise<Result>`.
  - `addTransaction` gains optional `groupId?: string`, stored as `group_id` for expense/income only.

- [ ] **Step 1:** Implement. Keep money maths in `tontine.ts`; actions only validate, persist, refresh.
- [ ] **Step 2:** Verify: `npx eslint src && npx tsc --noEmit` clean; `npx vitest run` still passes; `npx next build` passes.
- [ ] **Step 3:** Commit: `git commit -m "feat: tontine data access and server actions"`.

---

### Task 5: Group form (create, edit, new round)

**Files:**
- Create: `src/components/TontineForm.tsx`, `src/app/(app)/tontines/new/page.tsx`, `src/app/(app)/tontines/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `saveTontineGroup`, `estimateCycleEnd`, `addPeriods`, `usePickers`, `TontineView`.
- Produces: `<TontineForm today: string; group?: TontineView; from?: TontineView />` — `from` pre-fills a new round (same name/amount/names/frequency/time; cycle start = day after `from.group.cycle_end`; empty turns; "Carry 2,000 FCFA credit" switch on when `from.coverage.extraCredit + credit > 0`).

Form, top to bottom (copy fixed by the spec): Name · Amount per name · Number of names in the group · Names I hold (stepper, 1…names) · Frequency chips (Weekly / Monthly) · Deadline time (time picker, default 18:00) · Cycle start date · My next due date · Cycle end (prefilled with `estimateCycleEnd`, shows "Estimated" until edited) · "My turns" — one row per name held with a date button and an "Already collected (before the app)" switch. Live summary under the amounts: "You pay 5,000 FCFA every Friday · Payout 50,000 FCFA per turn". Primary button "Create group" / "Save changes"; on edit, a hint under amount fields: "Changes apply from your next unpaid deadline."

- [ ] **Step 1:** Build the form and pages (pages read data inside `<Suspense>` with a skeleton, like `savings/pots/new`).
- [ ] **Step 2:** Verify in the browser (signed in, migration applied): create "Friday tontine" with 2,500 × 20, 2 names, weekly, start Fri Sep 5, next due Fri Oct 24, turns Dec 5 and Feb 13 → redirects to the group page; summary reads "You pay 5,000 FCFA every Friday · Payout 50,000 FCFA per turn"; cycle end shows Fri, Jan 16. Lint/build clean.
- [ ] **Step 3:** Commit: `git commit -m "feat: create and edit tontine groups"`.

---

### Task 6: Group page, list and Collect payout

**Files:**
- Create: `src/components/TontineStatusLine.tsx`, `src/components/CollectPayoutSheet.tsx`, `src/app/(app)/tontines/page.tsx`, `src/app/(app)/tontines/[id]/page.tsx`

**Interfaces:**
- Consumes: `getTontineGroup(s)`, `collectTontinePayout`, `endTontineCycle`, `setTontineReminders`, `AddButton` (extend to accept `categoryId`, `groupId`, `amount`), `getPots`.
- Produces: `<TontineStatusLine view: TontineView; href?: string />` (tile with the group's icon tint by tone: ok → `teal`, soon → `amber`, late → `red`, turn → `violet`, done → `slate`; name; status text). `<CollectPayoutSheet turn: TontineTurn; groupName: string; today: string; pots: Pot[] />` (button + sheet).

Group page sections: header (name, Edit link) · status card (big status text, "Next due" line with amount, "Credit 2,000 FCFA" when > 0, primary **Log payment** opening the add sheet with the Tontine category, this group, and amount = next due amount) · **Your turns** timeline (date, amount, state chip: Upcoming / Today / Collected / Before the app; **Collect** button on today's or past upcoming turns) · **Payments** (this group's transactions, newest first) · settings rows (Reminders switch, Edit) · danger zone **End cycle** (confirm in-place: "End this cycle? Reminders stop and it moves to Past cycles." → **End cycle** / Cancel). Ended group: read-only with totals "Paid 65,000 · Collected 100,000 · Difference +35,000" and **Start a new round** linking `/tontines/new?from=<id>`.

Collect payout sheet: amount (prefilled `expected_amount`), date (date picker, max today), **Move to savings** switch → savings pot chips (non-tontine pots) + amount (default full payout), submit **Collect 50,000 FCFA** → toast "Payout of 50,000 FCFA recorded".

List page: "Tontines" title, active groups as `TontineStatusLine` rows, **New group** button, "Past cycles" section with totals per group. Empty state: "No groups yet. Add your tontine to know at a glance how far ahead you've paid."

- [ ] **Step 1:** Build components and pages.
- [ ] **Step 2:** Verify in the browser with the Task 5 group: log 20,000 → status "Covered until Fri, Nov 14"; mark a turn's date as today (edit) → Collect 50,000, move 40,000 to a Bank pot → Activity shows income 50,000 and deposit 40,000; Home net worth rises by 50,000; turn shows Collected. End cycle → group appears under Past cycles with totals. Lint/build clean.
- [ ] **Step 3:** Commit: `git commit -m "feat: tontine group page, list and payout collection"`.

---

### Task 7: Home and add-sheet integration

**Files:**
- Modify: `src/app/(app)/page.tsx`, `src/app/(app)/savings/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/AddSheet.tsx`, `src/components/AppShell.tsx`

**Interfaces:**
- Consumes: `getTontineGroups`, `TontineStatusLine`, `SheetRequest` (add `groupId?: string; amount?: number`).
- Produces: add sheet behaviour — when the picked expense category has `role === 'tontine'`: chips for active groups (preselect `req.groupId` or the only group), amount shortcuts "1 period" and "4 periods" computed from the group's per-period amount (labels "1 week · 5,000", "4 weeks · 20,000"; months for monthly); the saved expense carries `groupId`. Saving without a group is allowed only when the user has no active group.

Home: a "Tontines" section under the balance/reminder block with one `TontineStatusLine` per active group and "See all" → `/tontines`; hidden when there are none (a single "Track a tontine" link in its place). Savings page header gets a secondary link "Tontines".

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Verify: Home shows "Friday tontine · Covered until Fri, Nov 14"; tapping + → Expense → Tontine shows the group chip and shortcuts; "4 weeks · 20,000" fills the keypad amount; save → status moves to Fri, Dec 12. Lint/build clean.
- [ ] **Step 3:** Commit: `git commit -m "feat: tontine status on home and logging from the add sheet"`.

---

### Task 8: Reminders

**Files:**
- Modify: `src/app/api/cron/reminders/route.ts`

**Interfaces:**
- Consumes: `coverage`, `deadlines` from Task 2; `tontine_groups.last_due_reminder_for`, `last_behind_reminder_for`, `tontine_turns.notified_on`.

Per profile, per active group with `reminders_enabled`, using the profile's local date/minutes:
- **Payment due:** in the daily slot (local time ≥ `reminder_time`, within 3 h), if `coverage.nextDue === today + 1` and `last_due_reminder_for !== nextDue` and not paid ahead → push `{ title: '<group> payment due tomorrow', body: '<nextDueAmount> FCFA before 18:00.' (actual deadline time), url: '/tontines/<id>', tag: 'tontine-due-<id>-<nextDue>' }`, set `last_due_reminder_for = nextDue`.
- **Behind:** after 08:00, for the newest missed deadline `m` with `last_behind_reminder_for !== m` → push "`<group>`: payment missed" / "`<behindAmount>` FCFA is due." and set `last_behind_reminder_for = m`.
- **Turn day:** after 08:00, for each `upcoming` turn with `turn_on === today` and `notified_on` null → push "It's your turn: <amount> FCFA from <group>", url `/tontines/<id>`, set `notified_on = today`.

- [ ] **Step 1:** Implement, reusing the existing `push()` helper and VAPID setup.
- [ ] **Step 2:** Verify: with `CRON_SECRET` from `.env.local`, `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders` returns `{ users, sent }` without error; temporarily set a group's next due to tomorrow and the reminder time to a past minute → `sent ≥ 1` once, `sent` unchanged on a second call. Lint/build clean.
- [ ] **Step 3:** Commit: `git commit -m "feat: tontine payment, behind and turn-day reminders"`.

---

### Task 9: Docs and final check

**Files:**
- Modify: `README.md` (Tontines section; migration list now has two files to run in order), `DESIGN.md` (status line tones and the group page/payout sheet in the components list)

- [ ] **Step 1:** Update docs.
- [ ] **Step 2:** Full check: `npx vitest run`, `npx eslint src`, `npx tsc --noEmit`, `npx next build` all clean; walk Home → Tontines → group → Log payment → Collect payout on mobile width in light and dark.
- [ ] **Step 3:** Commit: `git commit -m "docs: tontine groups"`.
