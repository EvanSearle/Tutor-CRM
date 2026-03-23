import type { Student, Session, Reminder, DashboardMetrics, StudentStatus, PauseEvent, Payment } from "@/types";
import {
  MOCK_STUDENTS,
  MOCK_SESSIONS,
  MOCK_REMINDERS,
  MOCK_PAYMENTS,
  MOCK_PAUSE_EVENTS,
} from "./data";

// Internal mutable state for mock layer
let students = [...MOCK_STUDENTS];
let sessions = [...MOCK_SESSIONS];
let reminders = [...MOCK_REMINDERS];
let pauseEvents = [...MOCK_PAUSE_EVENTS];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 80));
}

export async function getStudents(): Promise<Student[]> {
  return delay([...students]);
}

export async function getStudentById(id: string): Promise<Student | null> {
  return delay(students.find((s) => s.id === id) ?? null);
}

export async function getSessionsByStudentId(studentId: string): Promise<Session[]> {
  const result = sessions
    .filter((s) => s.student_id === studentId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return delay(result);
}

export async function getReminders(): Promise<Reminder[]> {
  return delay([...reminders]);
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const activeStudents = students.filter((s) => s.status === "active").length;

  const sessionsThisWeek = sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= weekAgo && d <= today;
  }).length;

  const unpaidBalance = sessions
    .filter((s) => s.payment_status === "unpaid" || s.payment_status === "invoiced")
    .reduce((sum, s) => sum + s.amount_due, 0);

  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthlyRevenue = MOCK_PAYMENTS.filter((p) => {
    const d = new Date(p.paid_at);
    return d >= monthAgo && d <= today;
  }).reduce((sum, p) => sum + p.amount, 0);

  return delay({
    active_students: activeStudents,
    sessions_this_week: sessionsThisWeek,
    unpaid_balance: unpaidBalance,
    monthly_revenue: monthlyRevenue,
  });
}

export async function updateStudentStatus(id: string, status: StudentStatus): Promise<void> {
  students = students.map((s) =>
    s.id === id ? { ...s, status, updated_at: new Date().toISOString() } : s
  );
  return delay(undefined);
}

export async function addStudent(student: Student): Promise<void> {
  students = [student, ...students];
  return delay(undefined);
}

export async function updateStudent(updated: Student): Promise<void> {
  students = students.map((s) => (s.id === updated.id ? updated : s));
  return delay(undefined);
}

export async function addSession(session: Session): Promise<void> {
  sessions = [session, ...sessions];
  return delay(undefined);
}

export async function markSessionPaid(sessionId: string): Promise<void> {
  sessions = sessions.map((s) =>
    s.id === sessionId ? { ...s, payment_status: "paid" as const } : s
  );
  return delay(undefined);
}

export async function editSession(updated: Session): Promise<void> {
  sessions = sessions.map((s) => (s.id === updated.id ? updated : s));
  return delay(undefined);
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  const result = MOCK_PAYMENTS.filter((p) => p.student_id === studentId);
  return delay(result);
}

export async function pauseStudent(studentId: string, reason: string): Promise<void> {
  students = students.map((s) =>
    s.id === studentId ? { ...s, status: "paused" as const, pause_reason: reason, updated_at: new Date().toISOString() } : s
  );
  const event: PauseEvent = {
    id: `pe${Date.now()}`,
    student_id: studentId,
    tutor_id: "t1",
    action: "paused",
    reason,
    timestamp: new Date().toISOString(),
  };
  pauseEvents = [event, ...pauseEvents];
  return delay(undefined);
}

export async function unpauseStudent(studentId: string): Promise<void> {
  students = students.map((s) =>
    s.id === studentId ? { ...s, status: "active" as const, pause_reason: "", updated_at: new Date().toISOString() } : s
  );
  const event: PauseEvent = {
    id: `pe${Date.now()}`,
    student_id: studentId,
    tutor_id: "t1",
    action: "unpaused",
    reason: "",
    timestamp: new Date().toISOString(),
  };
  pauseEvents = [event, ...pauseEvents];
  return delay(undefined);
}

export async function getPauseEventsByStudentId(studentId: string): Promise<PauseEvent[]> {
  const result = pauseEvents
    .filter((e) => e.student_id === studentId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return delay(result);
}

export async function addReminder(reminder: Reminder): Promise<void> {
  reminders = [reminder, ...reminders];
  return delay(undefined);
}

export async function toggleReminder(id: string): Promise<void> {
  reminders = reminders.map((r) =>
    r.id === id ? { ...r, completed: !r.completed } : r
  );
  return delay(undefined);
}

export async function deleteReminder(id: string): Promise<void> {
  reminders = reminders.filter((r) => r.id !== id);
  return delay(undefined);
}
