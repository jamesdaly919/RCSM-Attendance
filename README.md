# Rotary Club of Santa Maria — Attendance App

A mobile-friendly dashboard that reads the club's attendance straight from a
Google Sheet and shows, at a glance, who has met the month's
attendance requirement, who still needs credits, and who is leading the Early
Bird race. It uses the same system as the Rotary Club of Mutya ng Santa Maria
app but is **fully independent of it** — its own Google Sheet, its own GitHub
repository, its own Vercel deployment, and its own rules — adapted for the
main club:

- **Attendance requirement: 50% of the month's meetings.** With the usual 4
  regular meetings a member needs 2 credits; the requirement adapts
  automatically when a month has fewer meetings (see Part 2).
- **Club goal: 50% attendance for the Rotary year**, tracked with its own
  progress ring on the Club page.

- **Birthdays** — the Members list and each member's page show a 🎂 beside a
  member's name on their birthday, and the Club page greets the day's
  celebrants.
- **Club position / designation** — President, Treasurer, Directors, PDG, etc.
  shown as a blue badge.
- **Recognitions** — Paul Harris Fellow, Major Donor, Benefactor, Arch Klumph
  Society, and so on, shown as gold 🎖️ badges, visible to everyone.
- **Past Presidents** — a gold 🏵️ badge with the year of service.
- **Honorary members** — shown in the app but excluded from requirements and
  leaderboards.

How the pieces fit together (identical to the Mutya setup):

- **Google Sheet** = the editable database (the secretary keeps updating it by hand)
- **This app** = the pretty read-only view (progress rings, leaderboards, event lists)
- **GitHub** = where this code lives
- **Vercel** = where the app is published for members to open

The app updates itself automatically: edit the sheet, and within a few minutes
the app reflects it. There is nothing to "publish" after each meeting.

---

## Part 1 — One-time setup (about 30 minutes total)

### Step 1. Create and build the Google Sheet (≈ 5 min)

Create a **new, empty** Google Sheet for RC Santa Maria (don't reuse the
Mutya sheet — each club has its own). A script builds the whole workbook,
**with the full roster already loaded** (55 members + 2 honorary, including
birthdays, Rotary IDs, classifications, positions, recognitions, and
past-president years) and July 2026 regular meetings seeded.

1. Open the new Google Sheet.
2. Menu **Extensions → Apps Script**.
3. Delete anything in the editor and paste the entire contents of
   `apps-script/setup-sheet.gs` from this project.
4. Click the **Save** (disk) icon.
5. In the dropdown at the top, choose **setupWorkbook**, then click **Run**.
6. Google will ask for permission: choose your account → **Advanced** →
   **Go to (project name)** → **Allow**. (You're authorizing your own script
   on your own sheet — this is normal.)
7. Go back to the sheet. You should now see tabs:
   **EntryPad, Settings, Members, Meetings, Attendance, EarlyBird, Reports**.
   (A hidden **Lookup** tab powers the name dropdowns — leave it alone.)
8. Check the **Meetings** tab: July was seeded assuming the club meets on
   **Tuesdays**. If the meeting day is different, just edit the dates and IDs.
9. Skim the **Members** tab `notes` column — a few items from the source
   roster need verifying (one duplicated Rotary ID, one unreadable ID, one
   unclear past-president year).

### Step 2. Share the sheet as read-only public (≈ 1 min)

The app reads the sheet directly from members' phones, so it must be viewable:

1. In the sheet, click **Share** (top right).
2. Under "General access", choose **Anyone with the link** → **Viewer**.
3. Done. Only people with the link can view; only you (and editors you invite)
   can edit.

> **Privacy note:** because the sheet is publicly viewable, it should hold
> only what the club is happy to publish: names, attendance, birthdays
> (month + day, no year), positions, and recognitions. Spouse names from the
> printed roster were deliberately **not** included. Rotary IDs are included
> for admin convenience — remove that column's contents if the club prefers.

### Step 3. Put the code on GitHub (≈ 10 min)

1. Log in at https://github.com.
2. Click the **+** (top right) → **New repository**.
   - Name: `rcsm-attendance`
   - Keep it **Public** (simplest) — the code contains no passwords or secrets.
   - Click **Create repository**.
3. On the new empty repository page, click the link
   **"uploading an existing file"**.
4. Drag **the contents of this project folder** (not the folder itself) into
   the upload box: `package.json`, `vite.config.js`, `index.html`, and the
   `src/`, `public/`, `apps-script/` folders, plus this `README.md`.
   *(Do NOT upload `node_modules` or `dist` if they exist on your computer.)*
5. Click **Commit changes**.

### Step 4. Connect the sheet to the app (≈ 2 min)

1. Copy the sheet's ID — the long code in its web address:
   `https://docs.google.com/spreadsheets/d/`**`THIS PART`**`/edit`
2. On GitHub, open `src/config.js`, click the pencil to edit, and paste the
   ID between the quotes of `SHEET_ID = ""`. Commit.

### Step 5. Deploy on Vercel (≈ 5 min)

1. Go to https://vercel.com and choose **Sign up → Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find `rcsm-attendance` in the list and click **Import**.
4. Vercel auto-detects **Vite**. Don't change anything. Click **Deploy**.
5. After ~1 minute you get a link like `https://rcsm-attendance.vercel.app`.
   That's your app — share it in the club group chat!

From now on, any time you change code on GitHub, Vercel republishes
automatically. You will rarely need to touch the code, though — everyday
updates happen only in the Google Sheet.

> **Logo:** the app uses the club's official Rotary masterbrand lockup
> (`public/logo.png`, with restored transparency) and the Rotary wheel as
> the app icon (`public/favicon.png`, `public/apple-touch-icon.png`,
> `public/icon-512.png`). To change any of them later, replace the files
> (same names) on GitHub — Vercel redeploys automatically.

---

## Part 2 — How the Google Sheet works day to day

Golden rules:

- **Dates are always typed as `YYYY-MM-DD`**, e.g. `2026-08-04`. The columns
  are pre-formatted as text so Sheets won't mangle them.
- **Birthdays are typed as month + day**, e.g. `January 3` (also accepted:
  `Jan 3`, `1/3`, `01-03`). No year needed.
- **Never rename the tabs** or their header row.
- Use the **dropdowns** — cells with dropdowns reject invalid values on purpose.
- If something is entered wrong anyway, the app's footer shows a
  **"Data check"** warning telling you the exact tab and row to fix.

### Add a new member

In the **Members** tab, add a row at the bottom:

| column | what to type |
|---|---|
| member_id | The next unused ID, e.g. `M056`. Never reuse an old ID. |
| last_name / first_name / middle_name / nickname | As usual |
| active_status | `Active` (dropdown; `Honorary` for honorary members) |
| join_date | Optional, `YYYY-MM-DD` |
| end_date / notes | Leave blank |
| birthday | e.g. `January 3` |
| rotary_id | The member's Rotary International ID |
| classification | e.g. `General Construction` |
| club_position | e.g. `Club Treasurer`, `Dir. / Youth Service Committee Chair` — leave blank if none |
| recognition | e.g. `Paul Harris Fellow +2`; separate several with `;` |
| past_president | Year of service, e.g. `2019-2020` — leave blank if not a PP |

Positions, recognitions, and past-president years appear immediately as
badges beside the member everywhere in the app. When officers change each
July 1, just edit the `club_position` column.

If a member leaves, **don't delete the row** — set `active_status` to
`Inactive` (their history stays, but they stop counting in club stats).
`Honorary` members likewise keep their page but are excluded from
requirements and leaderboards.

### Add a regular weekly meeting

In the **Meetings** tab, add a row — and **leave meeting_id blank; it writes
itself** the moment the date and type are filled in:

| column | example |
|---|---|
| meeting_id | leave blank → becomes `20260804-REG` automatically |
| date | `2026-08-04` |
| meeting_type | `regular` (dropdown) |
| activity_title | `Regular Meeting` (or `Induction`, etc.) |
| location | optional |
| credit_value | `1` |

Tip: add the whole month's meetings in advance — the app then shows members
the "next event they can attend".

### Add a makeup or special event

Same as above, but:

- meeting_type: `makeup` (or `special`)
- activity_title: e.g. `Coastal Cleanup`
- meeting_id: leave blank → becomes `20260815-COASTAL` automatically (the
  date plus the first useful word of the title; if that ID is taken, a
  number is appended, e.g. `20260815-COASTAL2`)

You can still type an ID by hand if you prefer — the script never overwrites
a meeting_id that's already filled in.

For social-media makeups (profile pic, reposts…), date them the **last day of
the month they count toward**, e.g. `2026-08-31`.

### Cancel an event

In the **Meetings** tab, set the event's **status** column to `cancelled`
(dropdown). Don't delete the row. The event immediately:

- disappears from the app's upcoming lists and can't be picked on EntryPad,
- shows greyed-out with a "Cancelled" tag on the Events page,
- stops counting for or against anyone — and it lowers that month's
  requirement if it was a regular meeting (see next section).

If attendance was recorded before the cancellation, those rows are simply
ignored (the Data check reminds you they exist).

### How the monthly requirement adapts

**A month's requirement = 50% of the scheduled (non-cancelled) regular
meetings that month, rounded up.** Examples:

- Normal month, 4 meetings → members need **2** credits.
- Month with 5 meetings → **3** credits (half of 5, rounded up).
- Month with 3 meetings → **2** credits; 2 meetings → **1**; 1 meeting → **1**.
- 4 meetings but 2 cancelled → **1** credit.

Credits can come from regular meetings *or* makeup activities either way. If a
month has no regular meetings entered yet, the fallback of **2** applies — so
add the month's meetings to the Meetings tab at the start of each month, and
the requirement adjusts itself.

The percentage lives in the **Settings** tab (`monthly_required_percent`,
currently `50`) — change it there if the club ever changes the rule.

### Mark projects (for the Projects leaderboard)

In the **Meetings** tab, set **is_project** to `yes` for club projects (tree
planting, medical missions, community service, etc.). The Leaders page has a
Projects board counting how many project events each member attended, this
month and this Rotary year. Social-media makeups and regular meetings are
normally left blank (= not a project).

### Record attendance after an event — use the EntryPad tab

The **EntryPad** tab shows the full roster once, with checkboxes, **always in
alphabetical order by last name** — new members slot into their alphabetical
place automatically, wherever their row sits on the Members tab. This is the
fast way to record a whole meeting (attendance *and* Early Birds in one pass):

1. In the **yellow cell** at the top, pick the event. Type part of its title
   or date and Sheets suggests the match.
2. **Tick "Present"** beside every member who attended.
3. For **regular meetings**, type the **EB rank** (1–5) beside the first five
   arrivals. Leave it blank for everyone else.
4. Leave **Credit** blank (blank = 1) unless the event is worth more.
5. Tick the green **SAVE** checkbox.

The script copies everything into the Attendance and EarlyBird tabs, skips
anything already recorded (so an accidental double-save is harmless), clears
the pad, and shows a confirmation like
*"✔ Saved 23 attendance rows + 5 Early Birds for Regular Meeting"*.
There's also a menu **Rotary Tools → Save EntryPad now** if you prefer.

You never scroll through the long Attendance log — it just grows quietly in
the background as the app's data source.

### Fixing or adding single rows by hand

You can still edit the **Attendance** and **EarlyBird** tabs directly — for a
correction, a late report, or deleting a mistaken row. The member and meeting
columns there accept **any of these**, with suggestions as you type:

- a member ID — `M024`
- a nickname — `ARNOLD`
- a full name — `ARNOLD INOCENCIO` or `INOCENCIO, ARNOLD`
- the full dropdown label — `ARNOLD · ARNOLD INOCENCIO · M024`

The web app understands all four forms. If it can't tell who you meant
(misspelled, or two members share the text you typed — this club has several
repeated nicknames like LOUIE, BOBBY, BONG, JUN, JOHN, and RICHARD, so prefer
the dropdown label or the ID for those), the app's Data check points at the
exact row so you can fix it.

Early Bird rules the app enforces: rank 1 = first to arrive, ranks 1–5 only
(the **first 5 members** to arrive at each regular meeting are awarded),
one award per row, regular meetings only. The number of slots lives in
Settings (`early_bird_slots_per_regular_meeting`, currently `5`).

### Monthly routine (summary)

1. Start of month: add the month's regular meetings to **Meetings**.
2. After each event: open **EntryPad**, pick the event, tick attendees,
   type EB ranks, tick SAVE.
3. That's it — the app recalculates everything by itself.
4. Every July 1: update `current_rotary_year_start` and
   `current_rotary_year_end` in the **Settings** tab, and refresh the
   `club_position` column for the new officers. The requirement and goal
   percentages (`monthly_required_percent`, `club_goal_percent`) carry over
   unless the club changes its rules.

---

## Part 3 — Turn on attendance reports ("I was there" button)

On each member's page, events they missed show a red button:
**"I was there — tell the admin."** Tapping it sends a note that lands as a
row in the sheet's **Reports** tab (with timestamp, member, event, and their
optional message). You review it, fix the Attendance tab if they're right,
and set the report's status to `resolved`.

This needs a one-time, ~5-minute activation, because the public sheet is
read-only and the button must *write*:

1. Open the sheet → **Extensions → Apps Script** (the script should already
   be pasted in from Step 1).
2. Click **Deploy → New deployment**.
3. Click the gear icon next to "Select type" → choose **Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**
   and authorize if asked.
5. Copy the **Web app URL** (it ends in `/exec`).
6. On GitHub, open `src/config.js`, click the pencil to edit, and paste the
   URL between the quotes of `REPORT_URL = ""`. Commit — Vercel redeploys
   automatically, and the red buttons appear.

Notes: "Execute as Me" means reports are written with *your* permission —
members never get edit access to the sheet. Until `REPORT_URL` is filled in,
the buttons stay hidden. Members can see when their report is pending
("Reported — the admin will review it"); once you fix the attendance, the
event flips to Attended.

Small maintenance point: if you later paste a **newer version of the script**,
run **upgradeSheet** once (it rebuilds EntryPad, Lookup, and dropdowns, and
adds any *missing* Settings rows — it never changes Settings values you've
already set), and use **Deploy → Manage deployments → (pencil) → New version**
so the existing URL keeps working — don't create a second deployment.

**Row limits:** Google Sheets tabs start with 1,000 rows and don't grow by
themselves. The script handles this: every data tab (Attendance, EarlyBird,
Meetings, Members, Reports, and the hidden Lookup) keeps at least 200 spare
rows and grows itself in 500-row chunks — automatically on every EntryPad
save and whenever a tab is edited by hand. With ~55 members the Attendance
log passes 1,000 rows in under 3 months, so this matters; you'll never need
to click "add more rows" yourself.

## Part 4 — How the app calculates things

- **Member monthly credits** = sum of `credit_given` for their attendance rows
  in that month (cancelled events excluded). The requirement is dynamic:
  **50% of the scheduled regular meetings that month, rounded up** (normally
  2 of 4).
  - meets it → **Complete** (ring turns gold); beyond it shows
    **Exceeded · +X extra**
  - below it → **Needs X more**
- **Club target %** (monthly) = sum of each active member's credits *capped
  at the month's requirement*, divided by (active members × requirement).
- **Club year goal** = the same capped sum across every month of the Rotary
  year that has scheduled regular meetings so far, divided by what full
  compliance would be, shown against the **50% yearly goal**
  (`club_goal_percent` in Settings).
- **Total credits recorded** = raw sum including extras above 4.
- **Projects** = attended events marked `is_project = yes`, counted per month
  and per Rotary year for the Projects leaderboard.
- **Early Bird counts** = number of EarlyBird rows per member (the first 5
  to arrive at each regular meeting), shown per month and per Rotary year
  (July–June).
- Only **Active** members count in club stats and leaderboards; Inactive and
  Honorary members can still be looked up individually.
- **Birthdays** compare the month + day in the Members tab with today's date
  in the club's timezone (Asia/Manila).

## Part 5 — Odds and ends

- **Home-screen icon:** when members use Safari's Share → "Add to Home
  Screen", the app installs with its own icon. Replace the files in
  `public/` with RC Santa Maria artwork any time.
- **Demo mode:** add `?demo=1` to the app address to preview it with the
  bundled roster and made-up July 2026 attendance (useful for testing
  without touching the sheet).
- **Refresh delay:** Google caches the public sheet feed for a few minutes.
  If an edit doesn't appear immediately, wait 2–5 minutes and reload.
- **Changing the sheet:** if you ever move to a new spreadsheet, put its ID in
  `src/config.js` on GitHub (edit the file in the browser → Commit) and Vercel
  redeploys automatically.
- **Privacy:** the sheet is view-only public. Keep it to names, attendance,
  birthdays (no year), positions, and recognitions — no contact details or
  spouse names. If the club later wants it private, the app can be switched
  to a Google Apps Script JSON endpoint; ask your friendly developer (or
  Claude) to make that change.

## Project structure

```
├── index.html              page shell + fonts
├── package.json            dependencies
├── vite.config.js          build config
├── public/logo.png         official club logo (transparent)
├── apps-script/
│   └── setup-sheet.gs      one-time sheet-building script (roster preloaded)
└── src/
    ├── config.js           ← sheet ID lives here (only file you may edit)
    ├── main.jsx            app entry
    ├── App.jsx             layout, navigation, data loading
    ├── styles.css          all styling (Rotary azure & gold)
    ├── lib/
    │   ├── csv.js          reads the sheet's CSV feed
    │   ├── data.js         fetches the tabs
    │   ├── stats.js        every calculation + birthdays/honors + validation
    │   └── sampleData.js   demo snapshot (real roster, fake attendance)
    └── components/
        ├── Dashboard.jsx   club overview + birthdays today
        ├── MemberPage.jsx  member lookup, badges, gear ring
        ├── EventsPage.jsx  events & Early Bird lists
        ├── LeadersPage.jsx leaderboards
        ├── Ring.jsx        the progress rings
        └── Shared.jsx      pickers, chips, badges, data check
```
