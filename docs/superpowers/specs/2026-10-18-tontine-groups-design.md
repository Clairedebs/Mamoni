# Tontine groups — design

Status: draft for approval · 2026-10-18 · app: Ma moni (Next.js 16 + Supabase, current branch)

## Why

The user takes part in rotating contribution groups (tontine / njangi / cotisation). Today she tracks them in her head: how many weeks she has paid ahead, when her turn is, what she owes the treasurer. She wants Ma moni to make that effortless. She does **not** want a njangi management app.

Her real case, which drives every decision below:

- A group of **20 names** (the number varies per group). Some people hold 2–3 names.
- Each name contributes **2,500 per week**, due **every Friday before 18:00**.
- Every Friday one name collects the pot: 2,500 × 20 = **50,000**.
- She holds **2 names** → owes **5,000 per week** and collects **twice** in the cycle (one turn per name, on different Fridays, known in advance).
- She pays **in advance and irregularly**: usually 4 weeks (20,000) on payday, sometimes more or less.
- Both names keep contributing until the whole cycle ends, whether or not their turn has passed.
- She sees contributions as **money spent** and the payout as **income**. She usually moves the payout into savings.

Success: she opens the app and immediately knows **"I'm covered until Fri, Nov 14"**, gets reminded only when she actually has to pay, and logs a payout in one step.

## Goals

1. Several independent groups at once, each with its own amount, frequency (weekly or monthly), number of names, and deadline.
2. A **"covered until"** date per group, computed from payments; credit for partial overpayments; a clear **behind** state.
3. **Turns**: one per name she holds, dates entered at setup, collected via one short form that records income and optionally moves part of it into a savings pot.
4. Quiet reminders: before the first unpaid deadline, on turn days, once when behind.
5. Close a cycle, keep a record, optionally start a new round with the same settings.

## Non-goals

- Managing the group: no members list, no treasurer tools, no tracking of other people's payments, no turn draws.
- Backfilling history: nothing before the user starts using the app is recorded as spending or income.
- Interest, penalties, fines, loans against the pot.
- Offline-first behaviour (separate v2 effort).

## Anti-goals (would be a failure even if it works)

- A form so long that setting up a group feels like admin work.
- Reminders every Friday while she's paid ahead.
- Payouts or old turns counted as income twice, or turns collected before the app counted as income.
- A tontine screen that drowns the budget: it's a small layer on top, not a second app.

## Accounting (decided by the user)

- **Contribution payment = spending.** It's an expense transaction in a "Tontine" spending category (created by default; user-editable like other categories), linked to the group.
- **Payout = income.** It's an income transaction in a "Tontine payout" income category, linked to the group and the turn.
- **Optional move to savings** in the same step = a normal deposit into an existing savings pot the user picks (any amount up to the payout).
- Consequence (accepted): net worth dips on payment and jumps on payout. The group itself holds no balance in the app.

## Group setup (one short form)

| Field | Example | Notes |
|---|---|---|
| Name | Friday tontine | |
| Amount per name | 2,500 FCFA | |
| Number of names in the group | 20 | varies per group; editable later |
| Names I hold | 2 | ≥ 1 |
| Frequency | Weekly / Monthly | |
| Deadline | Friday 18:00 (weekly) · day 5 at 18:00 (monthly) | time defaults to 18:00 |
| Cycle start date | Fri, Sep 5 | when the group began |
| My next due date | Fri, Oct 24 | first deadline she has **not** paid yet; everything is counted from here |
| My turns | Fri, Dec 5 · Fri, Feb 13 | one date per name held; each can be marked **"already collected (before the app)"** |

Derived, shown in the form as she types:

- **My contribution per period** = amount per name × names I hold (5,000).
- **Payout per turn** = amount per name × number of names (50,000). Editable per turn when collecting.
- **Estimated cycle end** = cycle start + (number of names − 1) periods (Fri, Jan 16 for 20 weekly names). Shown as an estimate; the user can override it.

## Coverage maths

- Deadlines are the sequence D₀ = *my next due date*, D₁ = D₀ + 1 period, … (weekly: +7 days; monthly: same day of month, clamped to month end), up to the cycle end.
- Each payment adds to a running **paid-in** total since D₀. With per-period amount A: full periods covered = ⌊paid / A⌋, **credit** = paid mod A.
- **Covered until** = the last fully covered deadline. **Next due** = the following deadline, with the amount still needed (A − credit).
- **Behind**: if a deadline (date + deadline time, in the user's time zone) passes without being covered, the group shows "1 week late · 5,000 due" (count and amount accumulate).
- If the coverage reaches the cycle end, the group shows **"Fully paid for this cycle"**; overpayment beyond the end is shown as credit, not lost.
- *(builder's call, confirmed in review)* Payments fill the **oldest uncovered deadline first**, so a late payment clears the arrears before it counts as paying ahead.
- *(builder's call)* Payments carry a date only. A payment dated **on or before** a deadline's date counts toward that deadline; "behind" is judged at deadline date + time in the user's time zone, and clears as soon as a covering payment is logged (backdated ones included).
- Changing the amount, names or frequency mid-cycle applies **from the next uncovered deadline on**; past coverage is not recomputed (builder may implement by snapshotting what was covered at the time of the change).

## Turns and payouts

- Each turn: date, expected payout, status (upcoming · today · collected · collected before the app).
- On the turn day (in her time zone) a push: "It's your turn: 50,000 from Friday tontine." Tapping opens the group with the **Collect payout** form.
- **Collect payout** form: amount received (prefilled), date (custom date picker, defaults to today), **Move to savings** toggle → savings pot + amount (defaults to the full payout). One submit records the income and the optional deposit together (atomic).
- "Collected before the app" turns are never recorded as income.
- Turns don't change contributions: she keeps paying for all her names until the cycle ends.

## Reminders (push, existing reminder job)

- **Payment due:** the day before the next uncovered deadline, at the user's reminder time. "Friday tontine: 5,000 due tomorrow at 18:00." Not sent while paid ahead.
- **Turn day:** morning of the turn date.
- **Behind:** once per missed deadline, the morning after it passes; never a daily repeat. If she catches up and later misses another deadline, that one gets its own single reminder *(builder's call)*.
- Per-group switch to mute reminders. These replace the current "Contribution day" setting and the per-pot due-date/repeat fields, which were a rougher first attempt.

## Where it lives in the app

- **Home:** a compact line or small card per active group: "Friday tontine · covered until Fri, Nov 14" (or "due tomorrow", "1 week late", "your turn today"). Tapping opens the group.
- **Groups list + group page:** reachable from Home and from Savings (exact entry points left to the builder within the existing design system). Group page shows the status, "Log payment" (opens the add sheet prefilled: Tontine category, this group, amount = remaining due or one period), the turns timeline, payment history, settings, and **End cycle**.
- **Add sheet:** when the Tontine spending category is picked, a group selector appears (if more than one active group) and amount shortcuts: "1 week 5,000 · 4 weeks 20,000".
- Visuals follow `DESIGN.md` (pickers, chips, sheets, tokens). No new visual language.

## Cycle end

- **End cycle** (manual, with a confirmation): stops reminders, moves the group to **Past cycles** with totals: paid during the app period, collected during the app period, difference.
- Credit left at cycle end is shown in the past-cycle totals. *(builder's call)* When starting a new round, the form offers to carry that credit into the new cycle (on by default).
- **Start a new round** from a past cycle: copies the settings, asks for the new start date, next due date and turn dates. (Builder's call, user to confirm usefulness.)

## Constraints

- Existing stack and conventions: Next.js 16 with Cache Components (dynamic reads inside `<Suspense>`, `connection()` before clock reads), Supabase with RLS on every table, server actions in `src/lib/actions.ts`, custom date/time pickers, English UI, FCFA whole numbers.
- New SQL goes in a new migration file; the user runs it in the Supabase SQL editor. The unapplied draft `supabase/migrations/20261019000000_tontines.sql` (pot-based model) must be **deleted**, not run.
- **Start fresh:** the user has no tontine data in the app yet, so no data conversion is needed.
- *(builder's call)* The default "Contributions" savings category stays (useful for mutual funds and group savings that are real savings); its description for new accounts becomes "Mutual funds and group savings" so it doesn't compete with tontine groups.
- The existing pot `due_date` / `repeat` fields and the "Contribution day" settings block are superseded; remove their UI. Dropping the columns is the builder's call.

## Left to the builder

Table design, how payments link to groups, how coverage is computed (on read vs stored), exact component breakdown, empty states, and the precise placement of entry points, within the constraints above.
