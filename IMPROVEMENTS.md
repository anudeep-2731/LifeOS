# Life OS Companion — Product Improvement Backlog

Research-backed feature ideas based on analysis of top apps (Duolingo, Daylio, Monzo, YNAB, Habitica, Fi Money, Todoist, Streaks, BeReal) and 2025 UX trends. Prioritized by impact vs effort.

---

## Current State (as of May 2025)

### What's already built
- 5-tab bottom nav: Dashboard, Morning, Voice (centre mic), Tasks, Money
- Voice capture → Gemini AI parses → saves to DB (expenses / tasks / meals / routines)
- Multi-intent voice parsing (one utterance → multiple DB saves)
- Processing state overlay (Thinking… spinner while Gemini parses)
- Mobile Chrome continuous-mode auto-restart (handles Android mic kill)
- Gmail expense import (OAuth → parse transaction emails)
- Morning routine tab with streak counter
- Habit template rollover (auto-creates routines from templates each day)
- Monthly finance view: expenses grouped by date, investments, income, EMIs
- Dexie (IndexedDB) for all offline-first storage

### Known gaps
- No home screen widget / ambient presence
- No weekly AI summary
- No predictive budget alerts
- No forward-looking "will I run out?" projection
- Money tab quick-add still requires a full bottom sheet
- No UPI SMS auto-import
- No streak rescue mechanic
- No "what should I do next" intelligence on tasks

---

## Priority 1 — High impact, low effort (build these first)

### 1.1 Weekly AI Summary Card
**What:** Every Sunday (or Monday morning), a card appears on the Dashboard summarizing the past 7 days.

**Content:**
- Routine completion rate ("6/7 days ✓ — best week in 3 months")
- Total spend vs budget ("Spent ₹12,400 — ₹1,800 under budget")
- Tasks completed count
- Best day of the week (highest routine completion)
- One AI-generated sentence insight ("You spend 2× more on weekends — your food budget needs a weekend buffer")

**How to build:**
- Trigger: `useEffect` on Dashboard load, check if `userStats` has a `weeklySummary_<weekStart>` key. If missing, generate it.
- Aggregate from Dexie: `db.routines`, `db.tasks`, `db.expenses` filtered to last 7 days
- Call `askGemini(prompt)` with the aggregated numbers to generate the insight sentence
- Store result in `db.userStats` keyed by week start date (so it only generates once per week)
- Display as a dismissible card at the top of Dashboard

**Reference apps:** Monzo monthly summaries, Spotify Wrapped, Apple Screen Time weekly reports

---

### 1.2 Predictive Budget Overspend Alert
**What:** A banner/card on the Money tab (and optionally Dashboard) that projects end-of-month spend.

**Logic:**
```
dailyAvg = totalSpentThisMonth / daysElapsed
projectedMonthTotal = dailyAvg × daysInMonth
overspendAmount = projectedMonthTotal - monthlyBudget
```

**Display rules:**
- Green: projected under budget by >10%
- Amber: within 10% of budget
- Red: projected to overspend — show "At current pace, you'll overspend by ₹X this month"

**How to build:**
- Add a `BudgetProjection` component to MoneyTab
- Read `monthlyBudget` from settings, expenses from current month
- Pure calculation, no AI needed
- Show as a pill/card below the month selector, above the transaction list

**Reference apps:** YNAB's "age of money" and goal progress, Monzo spending trends

---

### 1.3 Quick-Add Text Input on Money Tab
**What:** A persistent one-line text input at the top of the expense list. Type "350 zomato" or "paid 500 for petrol" and hit enter — it logs instantly, no bottom sheet.

**Parsing:** Reuse `parseFallback()` from VoiceCapture (it already handles this format). If it returns `type: expense` with an amount, save directly. If ambiguous, open the edit sheet pre-filled.

**How to build:**
- Add a `QuickAddBar` component above the expense list in MoneyTab
- `<input placeholder='e.g. "350 zomato" or "paid 500 petrol"' />`
- On Enter / submit: run `parseFallback(text, categories)`, if unambiguous → `db.expenses.add(...)` → clear field + show inline ✓ toast
- If ambiguous (no amount, or type !== expense) → open the existing AddExpenseSheet pre-filled

**Reference apps:** Todoist's natural language quick-add, any.do floating bar

---

### 1.4 Streak Rescue Mechanic
**What:** When the user opens the app after a missed day, show a gentle bottom sheet: "Looks like yesterday was a rest day — mark it as intentional to protect your streak?"

**How to build:**
- In `rolloverHabitTemplates` or Dashboard `useEffect`: check if yesterday has routines but all are `completed: false`
- If yes, show a one-time prompt stored in `db.userStats` as `streakRescueOffered_<date>`
- Two options: "Mark as rest day" (sets a `restDay_<date>` flag in userStats, streak continues) or "Skip" (streak breaks as normal)

**Reference apps:** Duolingo streak freeze, Habitica daily reset

---

### 1.5 Daily Completion Ring on Dashboard
**What:** Replace or augment the current streak display with a circular progress ring showing today's routine completion (e.g., 4/6 = 66% of the ring filled).

**How to build:**
- SVG circle with `strokeDasharray` / `strokeDashoffset` for the arc
- Data: `db.routines.where('date').equals(today)` → count completed / total
- Animate the fill when a routine is completed (dispatch `life-os:voice-saved` or a dedicated event)
- Place on Dashboard hero card

**Reference apps:** Streaks app (the definitive reference — their circle UI is the standard)

---

## Priority 2 — High impact, medium effort

### 2.1 UPI SMS Auto-Import (Weekly Batch)
**What:** Read the user's SMS inbox for bank debit alerts, extract transactions, and offer a weekly "review and confirm" import.

**Why India-specific:** UPI is the dominant payment rail but is fragmented across PhonePe, GPay, Paytm, and bank-direct UPI. No API aggregation exists. SMS is the only universal signal.

**Common SMS patterns to parse:**
```
"Rs.450.00 debited from A/c XX1234 to VPA zomato@icici on 10-05-25. UPI Ref: 123456"
"INR 350 spent on HDFC Bank Credit Card ending 5678 at SWIGGY on 10/05/2025"
"Your A/C XXXXX debited by Rs 1200 on 10-May-25 towards UPI/PHONEPE"
```

**How to build:**
- Web: `navigator.contacts` API doesn't give SMS access — this requires a native wrapper or PWA with Android SMS permission
- Practical path for a PWA: add an "Import from SMS" section where the user pastes raw SMS text (or forwards to a parsing screen) — manual but still reduces friction
- For a React Native / Capacitor upgrade in future: use `@capacitor-community/sms` or Android `READ_SMS` permission
- Parse patterns: regex for "Rs." / "INR" amounts, "debited" / "spent" keywords, merchant names

**Note:** Android Play Store now requires declaration of SMS permission use. Keep this as a user-initiated flow, not background.

---

### 2.2 "What Should I Do Next" — AI Task Picker
**What:** A card on the Tasks tab (or Dashboard) that says "You have 45 minutes — here's what to tackle" with 1-3 AI-selected tasks.

**Input signals to AI:**
- Current time of day
- Task priorities and estimated durations
- Which tasks are overdue (dueDate < today)
- Completed tasks so far today (energy proxy)

**Prompt pattern:**
```
It's 2:30pm. The user has these pending tasks: [list with priorities and durations].
They've completed 3 tasks today already.
Suggest the best 1-3 tasks to do in the next 30-60 minutes. 
Return JSON: [{ "id": number, "reason": "string" }]
```

**How to build:**
- "Focus now" button on TasksTab header → calls Gemini with context → shows a highlighted "Focus Mode" view of the 1-3 selected tasks
- Cache result for 30 minutes in component state (don't re-call on every render)

**Reference apps:** Todoist AI suggestions, Reclaim.ai, Motion

---

### 2.3 Month-End AI Letter
**What:** On the last day of the month (or first of next), generate a short personal summary paragraph — like a letter from the app to the user.

**Example output:**
> "May was your most consistent month in 3 months — you completed morning routines 24/31 days and built a 9-day streak in the second half. Your total spend was ₹38,200, ₹1,800 under budget. Dining was the only category over plan. Your biggest win: the 'call bank about credit card' task you'd been postponing for 2 weeks — you finally did it on May 18."

**How to build:**
- Trigger: first open of new month (check `userStats` for `monthLetter_<YYYY-MM>`)
- Aggregate: routines, tasks (especially long-postponed ones completed), expenses vs budget
- Call Gemini with a "write a warm, personal 3-sentence summary" prompt
- Display as a full-screen card with a share button (screenshot-friendly)

**Reference apps:** Monzo monthly summaries, Oura weekly readiness reports

---

### 2.4 Category Budget Alerts (Push Notification)
**What:** Push notification when a category exceeds 80% of its monthly budget mid-month.

**Example:** "You've spent ₹4,200 on Dining — 84% of your ₹5,000 budget. 18 days left."

**How to build:**
- Use the Web Push API (`Notification.requestPermission()`) — already available in PWAs
- Schedule checks via a Service Worker background sync or simply check on each app open
- Store `lastNotified_<category>_<month>` in `db.userStats` to avoid repeated alerts
- Settings toggle per category ("Notify me when I'm near my dining budget")

---

### 2.5 Expense Pattern Memory (Smart Correction Learning)
**What:** When the user edits a voice-logged or auto-imported expense (e.g., changes category from "Shopping" to "Health" for a pharmacy), remember that pattern.

**Storage structure:**
```js
// db.settings key: 'expensePatterns'
// value: { "pharmacy": "Health", "apollo": "Health", "swiggy": "Dining" }
```

**How to build:**
- In VoiceCapture's `handleConfirm`: if user edited `category` before saving, store `merchantKeyword → correctedCategory` in `expensePatterns`
- In `parseFallback` and `parseWithAI`: before returning, check if any word in the description matches a stored pattern and override category
- Also apply to Gmail import parser

---

## Priority 3 — Medium impact or higher effort

### 3.1 Home Screen Widget (iOS/Android)
**What:** A widget showing today's budget remaining, morning routine completion ring, and top 1-2 tasks.

**Why it matters:** The strongest retention apps (Streaks, Todoist, Fantastical) all exist *on the surface* of the OS. Users who never open the app still see their progress.

**How to build for a PWA:**
- True OS widgets require native code (React Native / Capacitor) — not achievable in a pure PWA today
- **PWA shortcut as proxy:** Add a dedicated `/widget` route that's a minimal, fast-loading summary screen. Add to home screen as a separate shortcut icon.
- Future path: migrate to Capacitor to enable iOS/Android widget targets via `@capacitor/widget` or native code

---

### 3.2 30-Day Personal Challenge System
**What:** User sets a challenge: "No dining > ₹2,000 this month" or "Complete morning routine 25/30 days." App tracks progress with a simple progress bar and daily check-in.

**How to build:**
- New `challenges` table in Dexie: `{ id, title, type (expense_cap/habit_streak), target, startDate, endDate, progress }`
- Challenge detail screen with a progress ring, daily log, and "days remaining" display
- At month-end: celebration card if completed, gentle debrief if not

---

### 3.3 Vernacular Language Voice Support
**What:** Allow voice input in Hindi (and later Telugu, Tamil, Kannada). The current setup uses `en-IN` locale which handles Hinglish reasonably well but struggles with full Hindi sentences.

**How to build:**
- Add a language selector in Settings: English (default), Hindi, Hinglish
- Change `rec.lang` based on setting: `'hi-IN'` for Hindi, `'en-IN'` for Hinglish
- Update Gemini prompt to handle Hindi text: add "User may speak in Hindi or Hinglish" to the parse prompt
- Test with: "तीन सौ रुपये खाने पर खर्च किए" (₹300 spent on food)

**Reference:** Fi Money and Jupiter's Hindi UI push in Tier 2 cities

---

### 3.4 WhatsApp-Style Group / Partner Finance
**What:** Share a budget or expense category with one other person (partner, family member). Both can log expenses; both see the combined view.

**Why:** Indian households frequently share finances. The individual-only model is a Western assumption. Apps that support household budgets (YNAB's shared budget, Splitwise) have significantly higher retention among couples.

**How to build:**
- Requires a backend (current app is 100% local IndexedDB). Would need a sync layer (Supabase, Firebase, or a simple Express API with WebSocket for real-time)
- This is a major architecture change — plan as a v2 feature once a backend is introduced

---

### 3.5 Festival / Seasonal Saving Pots
**What:** Named savings goals with target amounts and deadlines, optimized for Indian calendar events.

**Examples:** "Diwali fund — ₹5,000 by Oct 20", "Wedding gift — ₹3,000 by Aug 15"

**How to build:**
- New `savingPots` table: `{ id, name, targetAmount, targetDate, currentAmount, color, emoji }`
- Dashboard card showing pot progress bars
- Each month, user manually adds to a pot (or auto-transfer rule: "send ₹500 to Diwali fund each month")
- Festival calendar: pre-populated suggestions based on current month (e.g., suggest creating Diwali pot in September)

---

## UX Patterns to Apply Across All Tabs

These are principles from app research that should guide all future UI decisions:

### Loss aversion over reward seeking
Design for *not losing* rather than *gaining*. A "you're about to break your streak" alert works better than a "you earned a badge" reward. Every completion ring, streak counter, and budget bar should feel like something to protect.

### Ambient > active
The best interaction is one that doesn't require an interaction. Push notifications, widgets, and summary cards that surface insights without requiring the user to navigate to them.

### Progressive disclosure
Show the minimum for the most common action. Advanced options (recurring tasks, custom categories, detailed budget rules) should be 1-2 taps deeper — not on the default screen.

### Smart defaults that learn
Every time the user corrects something the app got wrong (category, priority, meal type), that correction should be remembered. The app should feel like it gets smarter with use.

### 10-second daily action
Audit every logging flow. If any core daily action takes more than 10 seconds from tap to saved, it will be abandoned. Voice capture is the fastest path — optimize all other entry points to match it.

---

## Reference App Features (Cheat Sheet for Future Agents)

| App | Feature to steal | Notes |
|---|---|---|
| Duolingo | Streak freeze, streak repair after break, loss-aversion notifications | Adapt for routine streaks |
| Daylio | 3-tap mood log, pattern detection ("you're happier when you exercise"), calendar heatmap | Adapt for daily completion ring |
| Habitica | Party quests where missed habits hurt the group | Only if social layer added |
| Monzo | Real-time push per transaction, monthly summaries, Pots with images | Pots for savings goals |
| YNAB | Zero-based budgeting philosophy, goal progress bars, Age of Money metric | Forward-looking budget projection |
| Todoist | Natural language parsing ("every Tuesday"), Karma system, Today view | Quick-add bar for tasks |
| Streaks | 12-habit limit, HealthKit auto-complete, watch complications | Completion ring UI |
| BeReal | Random-time daily prompts, authentic capture, no filters | Could inspire a "life snapshot" feature |
| Fi Money | "Ask Fi" conversational finance queries, Smart Deposit, connected accounts | Conversational query interface |
| Jupiter | Pots, spending categories, Jewel rewards | Savings pots feature |

---

## Technical Debt to Address Before v2

- No backend / sync — all data lives in IndexedDB on one device. Adding a lightweight sync layer (Supabase free tier) would unlock: multi-device, sharing, server-side summaries, push notifications.
- PWA push notifications not yet wired — `Notification.requestPermission()` + Service Worker needed for budget alerts and streak reminders.
- `parseFallback` and `parseWithAI` live in VoiceCapture — should be extracted to `src/lib/intentParser.js` so MoneyTab quick-add can reuse them without importing VoiceCapture.
- No data export — users need a "download all my data as CSV/JSON" option before they trust the app with long-term data.
- No onboarding flow — new users land on an empty dashboard with no guidance. A 3-screen "set your budget → add first routine → try voice" onboarding would dramatically improve activation.
