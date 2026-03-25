# TutorDesk CRM — Code Review Report

**Date:** 2026-03-23
**Agent:** code-review (claude-sonnet-4-6)
**Files reviewed:** 20

---

## Executive Summary

The codebase is well-structured and visually polished for a Phase 1 mock-data app. The most urgent issues are pervasive hardcoded dates (`"2026-03-20"`) that will silently produce wrong data the moment real dates diverge, and a cluster of unawaited async mutations in the student profile page that create fire-and-forget bugs. Three npm packages installed as dependencies (`@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-slot`, `class-variance-authority`) are not imported anywhere in source and should be removed. Accessibility is a notable gap: no ARIA attributes exist anywhere in the component tree, and the student table's clickable `<tr>` rows are keyboard-inaccessible.

---

## Issue Count

| Severity | Count |
|---|---|
| Critical | 5 |
| Major | 8 |
| Minor | 10 |
| **Total** | **23** |

---

## TypeScript Compiler Output

No errors found. (`npx tsc --noEmit` produced no output.)

---

## ESLint Output

No issues found. (`npx next lint --dir src` reported: `✔ No ESLint warnings or errors`)

---

## Critical Issues

### [CRIT-1] `daysSince()` uses hardcoded reference date instead of `new Date()`
- **File:** `src/lib/utils.ts` line 18
- **Category:** bug
- **Description:** `const today = new Date("2026-03-20")` is hardcoded. Every calculation that depends on `daysSince()` — "last session X days ago", needs-follow-up threshold, "today/yesterday" labels in Dashboard — is frozen at March 20, 2026. As of today (March 23) the values are already 3 days stale. The bug is confirmed visually in the browser: the Dashboard shows "No sessions today or yesterday" even though sessions exist within the real last 2 days when calculated from `new Date()`.
- **Fix:** Replace `new Date("2026-03-20")` with `new Date()`. Also fix the identical instances at `src/lib/mock/data.ts:160` (the `daysAgo()` helper) and `src/lib/mock/index.ts:38` (`getDashboardMetrics()`).

### [CRIT-2] `addSession()` and `markSessionPaid()` are called without `await` — mutations silently lost on error
- **File:** `src/app/students/[id]/page.tsx` lines 47 and 52
- **Category:** missing-error-handling / bug
- **Description:** Both `handleAddSession` and `handleMarkPaid` are plain (non-async) functions that call async mock mutations without awaiting them. The optimistic UI update happens immediately regardless of whether the underlying write succeeds. If the mock (or a real backend later) rejects, the UI is out of sync with the store and there is no error feedback.
  ```ts
  function handleAddSession(session: Session) {
    addSession(session);          // ← fire-and-forget
    setSessions((prev) => [session, ...prev]);
  }
  function handleMarkPaid(sessionId: string) {
    markSessionPaid(sessionId);   // ← fire-and-forget
    setSessions(...);
  }
  ```
- **Fix:** Convert both to `async` functions, `await` the mutation, and wrap in try/catch. Roll back the optimistic state update in the catch branch.

### [CRIT-3] `editSession()` also unawaited in `handleSaveEdit`
- **File:** `src/app/students/[id]/page.tsx` line 59
- **Category:** missing-error-handling / bug
- **Description:** Same pattern as CRIT-2. `handleSaveEdit` calls `editSession(updated)` without `await`, then immediately closes the edit modal and updates local state, regardless of success.
- **Fix:** Make `handleSaveEdit` async, await `editSession()`, wrap in try/catch with rollback.

### [CRIT-4] All `.then()` chains are missing `.catch()` — unhandled promise rejections
- **File:** `src/app/page.tsx:32`, `src/app/students/page.tsx:32`, `src/app/pipeline/page.tsx:167`, `src/app/students/[id]/page.tsx:38`
- **Category:** missing-error-handling
- **Description:** Every data-loading `useEffect` uses `.then()` without a `.catch()`. If any mock function rejects (or a real API call fails), the page stays in the loading skeleton forever with no error message and a swallowed rejection logged only to the console. Example from `src/app/page.tsx`:
  ```ts
  Promise.all([getDashboardMetrics(), getStudents()]).then(([m, s]) => {
    setMetrics(m);
    setStudents(s);
    setLoading(false);
  }); // no .catch()
  ```
- **Fix:** Append `.catch((err) => { console.error(err); setLoading(false); /* setError(true) */ })` to each chain, or convert to `async/await` with try/catch and an error state that renders a user-visible message.

### [CRIT-5] Hardcoded default date `"2026-03-20"` in `SessionLogForm` initial state
- **File:** `src/components/sessions/SessionLogForm.tsx` line 23
- **Category:** bug
- **Description:** The date input for logging a new session defaults to the hardcoded string `"2026-03-20"` rather than today's date. Every new session logged through the UI will be silently misdated unless the user manually corrects the field.
  ```ts
  const [date, setDate] = useState(initialSession?.date ?? "2026-03-20");
  ```
- **Fix:** Replace with `new Date().toISOString().split("T")[0]` to produce today's date dynamically.

---

## Major Issues

### [MAJOR-1] Outstanding balance logic includes "invoiced" sessions — double-counts payments
- **File:** `src/app/students/[id]/page.tsx` lines 108–112
- **Category:** logic
- **Description:** The Payments tab computes:
  ```ts
  const totalBilled = sessions.reduce((sum, s) => sum + s.amount_due, 0);
  const totalPaid   = sessions.filter(s => s.payment_status === "paid")
                              .reduce((sum, s) => sum + s.amount_due, 0);
  const outstanding = totalBilled - totalPaid;
  ```
  `totalBilled` includes all sessions (unpaid, invoiced, and paid). `totalPaid` only includes `"paid"`. So `outstanding` = unpaid + invoiced amounts — which is correct — but the "Total billed" metric card is misleading: it shows the sum of all sessions ever, not just what is still owed. More importantly, this diverges from the balance logic used in `StudentTable` and `Dashboard`, which filter to `unpaid || invoiced` only. These two different formulas for "outstanding" will produce different numbers for the same student. For Jamie Chen, `totalBilled` = $382.50, while the Dashboard/Table balance shows $85.00 — a visible discrepancy already confirmed in the browser.
- **Fix:** Align the Payments tab to use a single shared utility function for computing outstanding balance. Consider whether "Total billed" should show all-time billed or current cycle only, and document the intent.

### [MAJOR-2] `StudentForm` does not reset when `initial` prop changes — stale edit data
- **File:** `src/components/students/StudentForm.tsx` lines 36–55
- **Category:** state-management
- **Description:** The form state is initialised via `useState(() => initial ? {...} : EMPTY_FORM)`. The initialiser runs only once on mount. If the parent renders `<StudentForm initial={studentA} />`, then later changes to `initial={studentB}` without unmounting (e.g., opens the form for a different student), the form will still contain studentA's data. In the current app this is unlikely but becomes a real bug once a student-list context allows editing multiple students without remounting.
- **Fix:** Add a `useEffect` keyed on `initial?.id` that calls `setForm(...)` when the prop changes, or pass a `key={initial?.id ?? "new"}` to the `StudentForm` in each call site to force remount.

### [MAJOR-3] `getDashboardMetrics()` uses hardcoded date — metrics frozen
- **File:** `src/lib/mock/index.ts` lines 38–41
- **Category:** bug / logic
- **Description:** `const today = new Date("2026-03-20")` is used to calculate `sessionsThisWeek` and `monthlyRevenue`. As today is March 23, the "sessions this week" metric window is already 3 days behind; new sessions logged will not appear in the metric until the date string is updated.
- **Fix:** Replace `new Date("2026-03-20")` with `new Date()`. This is the same root cause as CRIT-1; fixing it centrally in `daysAgo()` / `daysSince()` will cascade correctly.

### [MAJOR-4] App pages import directly from `@/lib/mock` and `@/lib/mock/data` — bypasses query layer
- **File:** `src/app/page.tsx:8–9`, `src/app/students/page.tsx:9`, `src/app/pipeline/page.tsx:26`
- **Category:** architecture
- **Description:** The query layer (`src/lib/queries/`) exists precisely to abstract the data source. Three pages bypass it and import `getDashboardMetrics` directly from `@/lib/mock`, and `MOCK_SESSIONS` / `MOCK_PAYMENTS` directly from `@/lib/mock/data`. When these constants are later replaced with real API calls, every such import site must be hunted down. `MOCK_SESSIONS` is also used to initialise `useState` inline — meaning the session data never goes through the query layer and can never be replaced with async-fetched data without refactoring.
  ```ts
  // src/app/students/page.tsx
  import { MOCK_SESSIONS } from "@/lib/mock/data";
  const [sessions] = useState<Session[]>(MOCK_SESSIONS); // static, never re-fetched
  ```
- **Fix:** Expose `getSessions()` / `getPayments()` in the query layer and fetch them inside `useEffect` alongside `getStudents()`. Move `getDashboardMetrics` to `src/lib/queries/dashboard.ts`.

### [MAJOR-5] `handleDragEnd` in Pipeline has no try/catch around `updateStudentStatus`
- **File:** `src/app/pipeline/page.tsx` lines 217–222
- **Category:** missing-error-handling
- **Description:** The drag-end handler awaits the status update but has no error handling. If `updateStudentStatus` rejects, the optimistic card position stays changed but the error is unhandled and the snapshot-based rollback (`handleDragCancel`) is never invoked.
  ```ts
  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const finalStudent = students.find((s) => s.id === studentId);
    if (finalStudent) await updateStudentStatus(studentId, finalStudent.status);
    // no catch — on failure, UI shows wrong state permanently
  }
  ```
- **Fix:** Wrap in try/catch; on error, call `setStudents(studentsSnapshot)` to revert the optimistic update and show a toast/error.

### [MAJOR-6] `generateId()` uses `Math.random()` — collision-prone for production use
- **File:** `src/lib/utils.ts` lines 38–40
- **Category:** pattern
- **Description:** `Math.random().toString(36).slice(2, 11)` produces a 9-character base-36 string with ~46 bits of entropy. For a single-user mock this is fine, but leaving this in place when migrating to a real backend risks ID collisions and makes IDs guessable. It is also not a valid UUID format that databases commonly expect.
- **Fix:** Use `crypto.randomUUID()` (available in all modern browsers and Node 14.17+) for a standards-compliant, collision-resistant ID. Or, better, let the backend assign IDs on insertion.

### [MAJOR-7] `getPaymentsByStudentId` is missing return type annotation
- **File:** `src/lib/mock/index.ts` line 102
- **Category:** type-error
- **Description:** All other exported async functions in the mock layer carry explicit `Promise<T>` return types. `getPaymentsByStudentId` omits its return type, so TypeScript infers `Promise<Payment[]>` only because of the constant literal — if the implementation changes (e.g., the filter is altered), the inferred type could silently widen.
  ```ts
  export async function getPaymentsByStudentId(studentId: string) { // ← missing : Promise<Payment[]>
  ```
- **Fix:** Add `: Promise<Payment[]>` to the function signature.

### [MAJOR-8] `SessionLogForm` contains a redundant artificial delay — double-delays on top of mock layer
- **File:** `src/components/sessions/SessionLogForm.tsx` line 61
- **Category:** pattern / architecture
- **Description:** The form adds its own `await new Promise((r) => setTimeout(r, 80))` before calling `onSave`. The mock layer (`src/lib/mock/index.ts`) already applies an 80 ms `delay()` to every mutation. When the parent (`src/app/students/[id]/page.tsx`) awaits the mutations properly, the effective delay is 160 ms (or currently zero for the unawaited calls). The UI shows `saving…` for the full double-delay. This is confusing and leaks implementation detail (knowledge of the mock delay) into a UI component.
- **Fix:** Remove the artificial delay from `SessionLogForm`. The `onSave` callback is the parent's responsibility; the form should call it and let the caller handle async semantics. If a saving state is needed, the parent can pass an `isSaving` prop.

---

## Minor Issues

### [MINOR-1] `inputCls` string duplicated across two component files
- **File:** `src/components/students/StudentForm.tsx` line 221; `src/components/sessions/SessionLogForm.tsx` line 172
- **Category:** duplication
- **Description:** Identical `const inputCls = "w-full px-3 py-2 text-sm border border-surface-border rounded-lg..."` string defined separately in two files. A future style change to inputs requires editing both.
- **Fix:** Extract to a shared constants file (e.g., `src/lib/styles.ts`) and import from both components.

### [MINOR-2] `MOOD_DOT` constant duplicated across two files
- **File:** `src/app/page.tsx` line 16; `src/components/sessions/SessionItem.tsx` line 6
- **Category:** duplication
- **Description:** The same `Record<Mood, string>` mapping (`good → bg-green-500`, `okay → bg-amber-400`, `tough → bg-red-400`) is defined independently in both files.
- **Fix:** Define once in `src/lib/styles.ts` or `src/components/sessions/SessionItem.tsx` and export for reuse.

### [MINOR-3] `formatDate` re-exported from a component file
- **File:** `src/components/students/StudentTable.tsx` line 107
- **Category:** architecture / naming
- **Description:** `export { formatDate }` at the bottom of `StudentTable.tsx` re-exports a utility function that already lives in `src/lib/utils.ts`. This creates a second public export path for the same function and makes `StudentTable` appear to be a utility module.
- **Fix:** Remove the re-export. Any consumer that needs `formatDate` should import from `@/lib/utils` directly.

### [MINOR-4] `<tr onClick>` in `StudentTable` is not keyboard accessible
- **File:** `src/components/students/StudentTable.tsx` line 58
- **Category:** accessibility
- **Description:** The table row uses `onClick={() => router.push(...)}` but has no `onKeyDown` handler, no `tabIndex`, and no `role`. Keyboard users cannot tab to rows or activate them with Enter/Space. This also violates WCAG 2.1 SC 2.1.1 (Keyboard).
- **Fix:** Either (a) replace the click-on-row pattern with a visible link in the student name cell (already partially done — the name could be wrapped in `<Link>`), or (b) add `tabIndex={0}`, `role="button"`, and `onKeyDown={(e) => e.key === 'Enter' && router.push(...)}`.

### [MINOR-5] `StageDropdown` uses `mousedown` listener for close-on-outside-click but no equivalent keyboard dismiss
- **File:** `src/app/students/[id]/page.tsx` lines 348–353
- **Category:** accessibility
- **Description:** The custom stage dropdown closes when clicking outside via a `mousedown` document listener but has no `Escape` key handler and no `aria-expanded`, `aria-haspopup`, or `role="listbox"` attributes. Screen readers will not announce the dropdown state.
- **Fix:** Add `onKeyDown` handler for `Escape` to close the dropdown. Add `aria-expanded={open}`, `aria-haspopup="listbox"` to the trigger button, and `role="listbox"` to the menu container.

### [MINOR-6] Close button in `StudentForm` dialog has no `aria-label`
- **File:** `src/components/students/StudentForm.tsx` line 100
- **Category:** accessibility
- **Description:** The `<button onClick={onClose}>` containing only `<X size={18} />` (an SVG icon) has no accessible name. Screen readers will announce it as an unlabelled button.
- **Fix:** Add `aria-label="Close"` to the button.

### [MINOR-7] `isActive` computation duplicated in Sidebar's desktop and mobile renders
- **File:** `src/components/layout/Sidebar.tsx` lines 38–41 and 71–74
- **Category:** duplication
- **Description:** The `isActive` logic (`href === "/" ? pathname === "/" : pathname.startsWith(href)`) is copy-pasted identically inside both the desktop `map` and the mobile `map`. If the routing logic changes (e.g., to support nested routes), both copies must be updated.
- **Fix:** Extract to a helper: `const isNavActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href)` and call it in both render paths.

### [MINOR-8] Hardcoded date in Dashboard JSX — shows wrong weekday to real users
- **File:** `src/app/page.tsx` line 120
- **Category:** bug / minor
- **Description:** `<p className="text-sm text-ink-muted mt-0.5">Friday, March 20, 2026</p>` is a static string. Today is Monday, March 23, 2026 — the header is already wrong. Confirmed visually in the browser screenshot.
- **Fix:** Replace with a dynamic expression:
  ```tsx
  {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
  ```

### [MINOR-9] `hourly_rate` input accepts negative numbers and zero without validation feedback
- **File:** `src/components/students/StudentForm.tsx` lines 136–144
- **Category:** pattern
- **Description:** The hourly rate field has `type="number" min="0"` which prevents the browser spinner going below 0, but a user can still type `-50` and the HTML5 constraint only applies on form submission (it does show a browser validation popup). More critically, `parseFloat(form.hourly_rate) || 0` on line 78 silently converts an empty or invalid input to `0`, so a student can be saved with a $0/h rate with no warning.
- **Fix:** Add explicit validation in `handleSubmit`: if `hourly_rate <= 0`, set a form error state and prevent submission. Consider adding `required` to the field.

### [MINOR-10] `reminders/page.tsx` is a stub — `src/lib/queries/reminders.ts` exports dead code
- **File:** `src/app/reminders/page.tsx`; `src/lib/queries/reminders.ts`
- **Category:** dead-code
- **Description:** The Reminders page renders only a placeholder heading. `src/lib/queries/reminders.ts` exports `getReminders`, `addReminder`, and `toggleReminder` — none of which are imported anywhere in the app. `MOCK_REMINDERS` in `data.ts` is also fully populated (5 records) but unused by any page component. Confirmed visually: the browser shows only "Follow-up list coming soon."
- **Fix:** Either implement the Reminders page (the data layer is already complete) or add a code comment marking the exports as pending implementation. Remove or suppress the dead exports from the query file to avoid confusion.

---

## Dead Code & Unused Dependencies

### Unused npm packages (installed but never imported in `src/`)

| Package | Evidence |
|---|---|
| `@radix-ui/react-label` | Zero matches in `grep -rn "@radix-ui/react-label" src/` |
| `@radix-ui/react-select` | Zero matches in `grep -rn "@radix-ui/react-select" src/` |
| `@radix-ui/react-tabs` | Zero matches in `grep -rn "@radix-ui/react-tabs" src/` |
| `@radix-ui/react-slot` | Zero matches in `grep -rn "@radix-ui/react-slot" src/` |
| `class-variance-authority` | Zero matches in `grep -rn "class-variance-authority" src/` |

These 5 packages add unnecessary bundle weight and maintenance surface. Run `npm uninstall @radix-ui/react-label @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-slot class-variance-authority` to remove them.

### Dead exports

- `export { formatDate }` from `src/components/students/StudentTable.tsx:107` — the function is already exported from `src/lib/utils.ts`; this secondary export path is unused and misleading.
- `getReminders`, `addReminder`, `toggleReminder` from `src/lib/queries/reminders.ts` — exported but consumed nowhere in the app.
- `editSession` from `src/lib/mock/index.ts` — exported and wired in `src/lib/queries/sessions.ts`, and used in `src/app/students/[id]/page.tsx`, so not dead — but the call site (`handleSaveEdit` at line 59) is unawaited (see CRIT-3).

---

## Accessibility Findings

A comprehensive grep for all ARIA attributes (`aria-label`, `aria-expanded`, `aria-haspopup`, `aria-pressed`, `role=`) across all `.tsx` files returned **zero matches**. No ARIA attributes are present anywhere in the codebase. Key issues:

1. **[MINOR-4]** `<tr onClick>` rows in `StudentTable` are mouse-only (no `tabIndex`, no `role`, no keyboard handler).
2. **[MINOR-5]** Custom `StageDropdown` has no `aria-expanded`/`aria-haspopup`/`role="listbox"` — dropdown state is invisible to screen readers.
3. **[MINOR-6]** Icon-only close buttons (`<X />`) in `StudentForm` and the edit-session dialog have no `aria-label` — will be announced as unlabelled by screen readers.
4. Mood-selector buttons in `SessionLogForm` use a non-standard `data-active` attribute for state rather than `aria-pressed`.
5. The `<label>` elements in `SessionLogForm` and `StudentForm` are not associated with their inputs via `htmlFor`/`id` — they are visually proximate but not programmatically linked.
6. The navigation `<aside>` has no `aria-label` to distinguish it from other landmark regions.

---

## Performance Notes

1. **`daysSince()` called multiple times per render without memoization** — In `StudentTable`, `daysSince(lastSession.date)` is called 3 times in the same JSX expression (lines 78–83) for the same value. Extract to a `const days = daysSince(lastSession.date)` above the JSX.

2. **`getStudent()` is a linear scan called once per session in drawer renders** — `src/app/page.tsx` defines `getStudent(id)` as `students.find(s => s.id === id)` and calls it inside a `.map()` over sessions. For N sessions and M students this is O(N×M). Use `useMemo` to build a `Map<string, Student>` keyed by ID for O(1) lookup.

3. **`MOOD_DOT` and `PAYMENT_BADGE` lookup objects are module-level constants** — these are fine as-is; no performance concern.

4. **Inline arrow functions as event handlers on MetricCard and drawer buttons** — e.g., `onClick={() => setDrawer((d) => d === "active" ? null : "active")}` — these recreate on every render. For a small component tree this is acceptable but worth noting for when the component tree grows.

5. **No `useMemo` on `unpaidByStudent` and `revenueByStudent` in Dashboard** — both are derived from `students` + `sessions` + `payments` but computed unconditionally on every render. Wrapping in `useMemo([students, sessions, payments])` would avoid re-computation on unrelated state changes (e.g., `drawer` toggling).

---

## Browser Test Results

Dev server confirmed running at `http://localhost:3000`. All 5 pages tested with Playwright.

| Page | URL | Status | Console Errors | Notes |
|---|---|---|---|---|
| Dashboard | `/` | Renders | 1 (favicon 404) | Date header shows "Friday, March 20, 2026" — stale by 3 days. "Recent sessions" shows "No sessions today or yesterday" — caused by hardcoded date in `daysSince()`. Metrics appear correct for frozen date. |
| Students | `/students` | Renders | 0 | Full table of 8 students visible. Filter tabs working. Session "last seen" values are stale (based on hardcoded date). Sofia Patel balance $270.00 differs from profile tab calculation. |
| Student Profile (s1) | `/students/s1` | Renders | 0 | Session log form defaults to `2026-03-20` — visually confirmed. Sessions render correctly. Edit/Mark Paid buttons present. |
| Pipeline | `/pipeline` | Renders | 0 | Kanban board renders all 5 columns. Churned column (Ben Hartley) cut off at right edge — requires horizontal scroll. All drag handles visible. |
| Reminders | `/reminders` | Renders | 0 | Stub page only — "Follow-up list coming soon." 5 reminders exist in mock data but are never displayed. |

**Only non-critical browser error:** `favicon.ico` returns 404 — no favicon asset exists in `public/`.

---

## Recommended Fix Priority

1. **[CRIT-1 + CRIT-5 + MAJOR-3]** Fix all hardcoded `"2026-03-20"` dates (`utils.ts`, `mock/index.ts`, `mock/data.ts`, `SessionLogForm.tsx`). Single root cause, high impact — fixes frozen metrics, stale "days ago" labels, wrong session log default, and incorrect "needs follow-up" list simultaneously.

2. **[CRIT-2 + CRIT-3]** Await `addSession()`, `markSessionPaid()`, and `editSession()` in `students/[id]/page.tsx`. Low effort, prevents silent data loss bugs that will be real issues when a backend is introduced.

3. **[CRIT-4]** Add `.catch()` to all four `.then()` data-loading chains. One-liner per page; prevents permanent loading skeleton on any fetch failure.

4. **[MAJOR-1]** Fix outstanding balance calculation inconsistency between Payments tab and StudentTable/Dashboard. Define a single `getOutstandingBalance(sessions)` utility used everywhere.

5. **[MAJOR-4]** Remove direct `MOCK_SESSIONS`/`MOCK_PAYMENTS`/`getDashboardMetrics` imports from app pages. Route all data through the query layer. This is the highest-priority architectural change before adding a real backend.

6. **[MAJOR-5]** Add try/catch to `handleDragEnd` in Pipeline with snapshot rollback on error.

7. **[MAJOR-2]** Fix `StudentForm` stale-initial bug by adding a `useEffect` keyed on `initial?.id` or using a `key` prop.

8. **[MINOR-4 + MINOR-5 + MINOR-6]** Address the three highest-impact accessibility gaps: `<tr>` keyboard navigation, `StageDropdown` ARIA attributes, icon-button `aria-label`s.

9. **Dead dependencies** — Run `npm uninstall @radix-ui/react-label @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-slot class-variance-authority`. Zero risk, reduces install size by ~5 packages.

10. **[MINOR-10]** Implement the Reminders page — the data layer (`MOCK_REMINDERS`, `getReminders`, `addReminder`, `toggleReminder`) is already complete and fully functional. This is the only named feature that is entirely unbuilt.
