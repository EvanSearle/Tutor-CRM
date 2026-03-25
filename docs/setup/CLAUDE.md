# TutorDesk — Project Spec for Claude Code

## What We're Building
TutorDesk is a lightweight CRM built specifically for independent tutors. It replaces the duct-taped mess of Calendly + Notion + Venmo with a single tool that thinks in students, not sales deals. The target user is a solo tutor managing 5–20 active students.

**Core insight**: the session log + follow-up reminder loop is the heart of the product. If a tutor opens TutorDesk after every session to write 2 sentences, the whole CRM stays alive.

---

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend/DB**: Supabase (auth, Postgres, real-time)
- **Routing**: React Router v6
- **State**: Zustand for client state, React Query for server state
- **Payments (billing)**: Stripe (for SaaS subscriptions — Phase 2)
- **Hosting**: Vercel (frontend), Supabase (backend)

---

## Database Schema

### users
Managed by Supabase Auth. Extended with a `profiles` table:
```sql
profiles (id, full_name, timezone, created_at)
```

### students
```sql
students (
  id uuid primary key,
  tutor_id uuid references profiles(id),
  name text not null,
  grade text,
  subjects text[],
  student_email text,
  parent_name text,
  parent_email text,
  parent_phone text,
  hourly_rate decimal,
  currency text default 'CAD',
  status text check (status in ('prospect','trial','active','paused','churned')),
  source text,
  notes text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

### sessions
```sql
sessions (
  id uuid primary key,
  student_id uuid references students(id),
  tutor_id uuid references profiles(id),
  date date not null,
  duration_minutes int,
  notes text,
  mood text check (mood in ('good','okay','tough')),
  payment_status text check (payment_status in ('unpaid','invoiced','paid')) default 'unpaid',
  amount_due decimal,
  created_at timestamptz default now()
)
```

### reminders
```sql
reminders (
  id uuid primary key,
  student_id uuid references students(id),
  tutor_id uuid references profiles(id),
  note text not null,
  due_date date,
  completed boolean default false,
  created_at timestamptz default now()
)
```

### payments
```sql
payments (
  id uuid primary key,
  student_id uuid references students(id),
  tutor_id uuid references profiles(id),
  amount decimal not null,
  currency text default 'CAD',
  method text,
  note text,
  paid_at timestamptz,
  session_ids uuid[]
)
```

---

## Application Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Metrics, follow-up flags, upcoming sessions |
| `/students` | Student List | Table of all students with search/filter |
| `/students/:id` | Student Profile | Tabs: Sessions, Details, Payments |
| `/students/new` | Add Student | Form to create new student |
| `/pipeline` | Pipeline | Kanban: Prospect → Trial → Active → Paused → Churned |
| `/reminders` | Reminders | List of pending follow-ups and tasks |
| `/login` | Login | Supabase Auth — email + Google OAuth |

---

## Key UI Behaviours

### Dashboard
- Metric cards: Active students, Sessions this week, Unpaid balance, Monthly revenue
- "Needs follow-up" list: students with no session logged in 7+ days, sorted by days silent
- "Upcoming sessions" list: sessions scheduled for today/tomorrow
- Everything is clickable and routes to the relevant student profile

### Student List
- Sortable table: Name, Subject, Status, Rate, Last session, Balance
- Status badge colours: active=green, trial=amber, prospect=blue, paused=gray, churned=red
- Inline unpaid badge shows amount owed
- Search filters by name, subject, or tag
- Click any row → Student Profile

### Student Profile
Three tabs:
1. **Sessions** — quick-log form at top (date, duration, notes, mood picker), session history below
2. **Details** — all student/parent info in an editable form
3. **Payments** — summary metrics (billed/paid/outstanding) + payment history

### Pipeline
- 4-column kanban layout
- Cards show student name + subject + time in stage
- Drag-and-drop to change status (updates DB)
- Click any card → Student Profile

### Reminders
- Checkbox list, sortable by due date
- Check off a reminder → marks completed with strikethrough
- "Add reminder" opens a modal with student picker + note + due date

---

## Design Direction

TutorDesk should feel **calm, professional, and human** — like a well-designed notebook, not enterprise software. The aesthetic is refined minimalism with warm undertones.

### Specific direction:
- **Tone**: Clean and educator-friendly. Not corporate. Not startup-flashy. Think: a well-designed planner or Moleskine app.
- **Typography**: Use a distinctive, warm font pairing. Avoid Inter, Roboto, Arial. Consider DM Serif Display or Fraunces for headings, Plus Jakarta Sans or Outfit for body.
- **Colour palette**: Warm off-whites and creams for backgrounds. A single teal/sage accent (#1D9E75 or similar). Muted semantic colours for status badges. No purple gradients.
- **Layout**: Sidebar nav (200px), content area takes remaining width. Clean table rows with generous padding. Cards with subtle 0.5px borders, no heavy shadows.
- **Motion**: Subtle — page transitions, hover states on rows and cards, smooth status badge changes. Nothing distracting.
- **What makes it memorable**: It feels like it was designed by someone who actually tutors. Warm, focused, zero clutter.

### DO NOT:
- Use Inter, Roboto, or system-ui as the primary font
- Use purple gradients or blue-heavy palettes
- Build generic-looking dashboard chrome
- Add features not listed in this spec (keep it tight for V1)

---

## Supabase Setup Notes
- Enable Row Level Security (RLS) on all tables
- All queries must filter by `tutor_id = auth.uid()` — tutors can only see their own data
- Enable Google OAuth in Supabase Auth dashboard
- Use Supabase realtime on the `reminders` table for live updates

---

## File Structure
```
src/
  components/
    layout/        # Sidebar, TopBar, PageWrapper
    ui/            # shadcn/ui components
    students/      # StudentCard, StudentTable, StudentForm
    sessions/      # SessionLogForm, SessionItem
    reminders/     # ReminderList, ReminderItem
    pipeline/      # PipelineBoard, PipelineCard
  app/             # Next.js App Router pages
    page.tsx       # Dashboard
    students/
    pipeline/
    reminders/
  lib/
    mock/
      data.ts      # Hardcoded realistic seed data
      index.ts     # Async mock query functions (80ms delay)
    queries/
      students.ts  # Re-exports mock now, Supabase later
      sessions.ts
      reminders.ts
      payments.ts
    utils.ts       # Helpers (formatCurrency, daysSince, etc.)
  types/
    index.ts       # Student, Session, Reminder, Payment, DashboardMetrics
```

The `queries/` layer is the only thing that changes when Supabase is added.
Components never import from `mock/` directly.

---

## Build Order (follow this sequence)

### Phase 1 — UI with mock data (no Supabase needed)
1. App shell + mock data layer — project setup, types, query abstraction, sidebar layout
2. Student list page — table, search, filter, add student modal
3. Student profile — all three tabs working
4. Dashboard — metrics + follow-up logic computed from mock data
5. Pipeline — kanban with drag-and-drop status changes
6. Reminders — list, add, complete
7. Polish pass — transitions, empty states, loading skeletons, error handling

### Phase 2 — Supabase swap (add when UI is complete)
8. Supabase project setup — schema migrations, RLS, seed data
9. Swap mock queries for real Supabase calls (only `src/lib/queries/` changes)
10. Auth flow — sign up, log in, protected routes
11. Production deploy — Vercel + environment variables

Do not skip ahead. Each step should be fully working before moving to the next.

---

## Definition of Done (V1)
- [ ] Tutor can add, edit, and view students
- [ ] Tutor can log a session with notes and mood
- [ ] Dashboard shows correct metrics and follow-up flags
- [ ] Pipeline view reflects student statuses with drag-and-drop
- [ ] Reminders can be created and checked off
- [ ] All pages have loading states, empty states, and error handling
- [ ] No TypeScript errors (`tsc --noEmit` passes clean)
- [ ] App is responsive on mobile (sidebar collapses to bottom nav <768px)
- [ ] *(Phase 2)* All data scoped to logged-in tutor via Supabase RLS
- [ ] *(Phase 2)* Deployed on Vercel and functional in production
