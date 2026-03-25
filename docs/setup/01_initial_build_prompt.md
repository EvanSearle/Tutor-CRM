# TutorDesk — Initial Build Prompt (Mock-First)

Paste this as your first message when you open Claude Code in your project folder.

---

I'm building TutorDesk, a lightweight CRM for independent tutors. Full project spec is
in CLAUDE.md — read it completely before writing any code.

We are starting with **Step 1: App shell + mock data layer**.

We are NOT setting up Supabase yet. All data will come from local mock files.
Supabase will be swapped in later once the UI is fully built and working.

## Your tasks for this session

### 1. Initialize the project
- Create a new Next.js app with TypeScript and Tailwind CSS (App Router)
- Install dependencies:
  - `shadcn/ui` (init with default config)
  - `@dnd-kit/core` and `@dnd-kit/sortable` (for pipeline drag-and-drop later)
  - `clsx` and `tailwind-merge` (utility)
- No Supabase packages yet

### 2. Set up the mock data layer
Create `src/lib/mock/data.ts` with realistic hardcoded data matching the types in
CLAUDE.md exactly. Include:
- 8 students across all statuses (prospect, trial, active, paused, churned)
- 15–20 sessions spread across students, going back 90 days, mix of moods and
  payment statuses
- 5 reminders, some completed, some overdue
- 2 payments already recorded

Create `src/lib/mock/index.ts` that exports async functions mimicking what real
Supabase queries will look like — they return Promises that resolve after a small
delay (80ms) to simulate real network latency:

```ts
// Example shape — implement all of these:
export async function getStudents(): Promise<Student[]>
export async function getStudentById(id: string): Promise<Student | null>
export async function getSessionsByStudentId(studentId: string): Promise<Session[]>
export async function getReminders(): Promise<Reminder[]>
export async function getDashboardMetrics(): Promise<DashboardMetrics>
export async function updateStudentStatus(id: string, status: StudentStatus): Promise<void>
```

Create `src/lib/queries/` folder with one file per entity — these files simply
re-export from the mock layer for now. Later, swapping to Supabase means only
changing these files:
- `src/lib/queries/students.ts`
- `src/lib/queries/sessions.ts`
- `src/lib/queries/reminders.ts`
- `src/lib/queries/payments.ts`

Create `src/types/index.ts` with full TypeScript types for all entities (Student,
Session, Reminder, Payment, DashboardMetrics) matching the data model in CLAUDE.md.

### 3. Build the app shell
- Fixed left sidebar (200px) with icon + label nav for all 5 pages
- App name "tutordesk" with the primary teal color on "desk"
- Active nav item highlighted
- Scrollable main content area
- All 5 routes as placeholder pages (just the title rendered, no content yet)
- Apply the full design system from CLAUDE.md:
  - CSS variables for all colors
  - DM Sans + DM Mono loaded from Google Fonts
  - Tailwind config extended with brand colors

### 4. Build the Student List page (`/students`)
This is the most important page to get right first — it's where tutors spend the
most time.

- Table with columns: Name + parent, Subject, Status badge, Rate, Last session, Balance
- Status badges with correct colors per CLAUDE.md
- Search input that filters by student name in real-time (client-side)
- Filter tabs: All / Active / Trial / Prospect / Paused / Churned with counts
- Click any row → navigate to `/students/:id`
- "+ Add student" button → modal form with all fields from CLAUDE.md
  (form should work and add to local state, even though it won't persist on refresh yet)
- Loading skeleton shown for 80ms while mock data "loads"
- Empty state if search returns no results

### 5. Build the Student Profile page (`/students/:id`)
Three tabs: Sessions, Details, Payments

**Sessions tab:**
- "Log a session" form: date (default today), duration (number input, minutes),
  notes textarea, mood picker (Good / Okay / Tough as pill buttons), payment status
- Save adds to local state and shows in session history immediately
- Session history list: date, notes preview, mood dot, duration, payment badge
- "Mark as paid" on unpaid sessions

**Details tab:**
- All student fields displayed in a clean grid
- "Edit" button → same modal as add student, pre-filled

**Payments tab:**
- 3 metric cards: total billed, total paid, outstanding (computed from sessions)
- Payment history list
- "Send payment reminder" button → copies a pre-written message to clipboard:
  "Hi [parent name], just a reminder that [student name] has an outstanding balance
  of $[amount]. Please let me know if you have any questions!"

## When you're done

The app should:
- Run with `npm run dev` without TypeScript errors
- Show realistic mock data throughout
- Have fully working student list with search + filter
- Have fully working student profile with all three tabs
- Feel polished — loading states, empty states, smooth nav between pages

Tell me what you built, show me the file structure, and flag anything that needs
my input before we move to the next session.

## Reminders
- Follow the design direction in CLAUDE.md exactly
- No `any` types anywhere
- All data access goes through `src/lib/queries/` — never import from mock directly
  in components
- The 80ms mock delay is intentional — build proper loading states now so they're
  ready when real latency exists
- Read CLAUDE.md fully before starting
