"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, CalendarCheck, AlertCircle, TrendingUp, X, Copy, CheckCheck, ChevronRight } from "lucide-react";
import type { Student, Session, DashboardMetrics, Payment } from "@/types";
import { getStudents } from "@/lib/queries/students";
import { getDashboardMetrics } from "@/lib/mock";
import { MOCK_SESSIONS, MOCK_PAYMENTS } from "@/lib/mock/data";
import { formatCurrency, daysSince, formatDate, formatDuration } from "@/lib/utils";
import { StatusBadge } from "@/components/students/StatusBadge";
import { cn } from "@/lib/utils";

type DrawerKey = "active" | "sessions" | "unpaid" | "revenue" | null;

const MOOD_DOT: Record<Session["mood"], string> = {
  good: "bg-green-500",
  okay: "bg-amber-400",
  tough: "bg-red-400",
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [payments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDashboardMetrics(), getStudents()]).then(([m, s]) => {
      setMetrics(m);
      setStudents(s);
      setLoading(false);
    });
  }, []);

  function getStudent(id: string) {
    return students.find((s) => s.id === id);
  }

  // Needs follow-up
  const needsFollowUp = students
    .filter((s) => s.status === "active" || s.status === "trial")
    .map((s) => {
      const last = sessions
        .filter((sess) => sess.student_id === s.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      return { student: s, lastSession: last, days: last ? daysSince(last.date) : 999 };
    })
    .filter(({ days }) => days >= 7)
    .sort((a, b) => b.days - a.days);

  // Recent sessions (today + yesterday)
  const recentSessions = sessions
    .filter((s) => daysSince(s.date) <= 1)
    .sort((a, b) => b.date.localeCompare(a.date));

  // ── Drawer data ──────────────────────────────────────────────

  // Active students
  const activeStudents = students.filter((s) => s.status === "active");

  // Sessions this week (last 7 days)
  const weekSessions = sessions
    .filter((s) => daysSince(s.date) <= 7)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Unpaid balance breakdown by student
  const unpaidByStudent = students
    .map((student) => {
      const unpaidSessions = sessions.filter(
        (s) => s.student_id === student.id && (s.payment_status === "unpaid" || s.payment_status === "invoiced")
      );
      const total = unpaidSessions.reduce((sum, s) => sum + s.amount_due, 0);
      return { student, unpaidSessions, total };
    })
    .filter(({ total }) => total > 0)
    .sort((a, b) => b.total - a.total);

  // Monthly revenue by student (from payments in last 30 days)
  const revenueByStudent = students
    .map((student) => {
      const studentPayments = payments.filter(
        (p) => p.student_id === student.id && daysSince(p.paid_at) <= 30
      );
      const total = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      return { student, studentPayments, total };
    })
    .filter(({ total }) => total > 0)
    .sort((a, b) => b.total - a.total);

  function copyReminder(student: Student, total: number) {
    const msg = `Hi ${student.parent_name}, just a reminder that ${student.name} has an outstanding balance of ${formatCurrency(total, student.currency)}. Please let me know if you have any questions!`;
    navigator.clipboard.writeText(msg);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-40 bg-surface-border rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-muted mt-0.5">Friday, March 20, 2026</p>
        </div>

        {/* Metric cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Users size={16} />}
              label="Active students"
              value={String(metrics.active_students)}
              iconColor="text-brand-teal"
              iconBg="bg-brand-teal-light"
              onClick={() => setDrawer("active")}
              active={drawer === "active"}
            />
            <MetricCard
              icon={<CalendarCheck size={16} />}
              label="Sessions this week"
              value={String(metrics.sessions_this_week)}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              onClick={() => setDrawer("sessions")}
              active={drawer === "sessions"}
            />
            <MetricCard
              icon={<AlertCircle size={16} />}
              label="Unpaid balance"
              value={formatCurrency(metrics.unpaid_balance)}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
              onClick={() => setDrawer("unpaid")}
              active={drawer === "unpaid"}
            />
            <MetricCard
              icon={<TrendingUp size={16} />}
              label="Monthly revenue"
              value={formatCurrency(metrics.monthly_revenue)}
              iconColor="text-green-600"
              iconBg="bg-green-50"
              onClick={() => setDrawer("revenue")}
              active={drawer === "revenue"}
            />
          </div>
        )}

        {/* Inline drawer panel */}
        {drawer && (
          <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
              <p className="text-sm font-semibold text-ink">
                {drawer === "active" && `Active students (${activeStudents.length})`}
                {drawer === "sessions" && `Sessions this week (${weekSessions.length})`}
                {drawer === "unpaid" && `Unpaid balance breakdown`}
                {drawer === "revenue" && `Monthly revenue breakdown`}
              </p>
              <button
                onClick={() => setDrawer(null)}
                className="text-ink-faint hover:text-ink transition-colors p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Active students */}
            {drawer === "active" && (
              <div className="divide-y divide-surface-border">
                {activeStudents.length === 0 && (
                  <p className="text-sm text-ink-muted text-center py-8">No active students.</p>
                )}
                {activeStudents.map((student) => {
                  const last = sessions
                    .filter((s) => s.student_id === student.id)
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  return (
                    <Link
                      key={student.id}
                      href={`/students/${student.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-muted/60 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{student.name}</p>
                        <p className="text-xs text-ink-faint mt-0.5">
                          {student.grade} · {student.subjects.join(", ")} · {formatCurrency(student.hourly_rate)}/h
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {last && (
                          <span className="text-xs text-ink-faint">
                            Last session {daysSince(last.date) === 0 ? "today" : `${daysSince(last.date)}d ago`}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-ink-faint group-hover:text-ink transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Sessions this week */}
            {drawer === "sessions" && (
              <div className="divide-y divide-surface-border">
                {weekSessions.length === 0 && (
                  <p className="text-sm text-ink-muted text-center py-8">No sessions this week.</p>
                )}
                {weekSessions.map((session) => {
                  const student = getStudent(session.student_id);
                  return (
                    <Link
                      key={session.id}
                      href={`/students/${session.student_id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-muted/60 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", MOOD_DOT[session.mood])} />
                        <div>
                          <p className="text-sm font-medium text-ink">{student?.name ?? "Unknown"}</p>
                          <p className="text-xs text-ink-faint mt-0.5">
                            {formatDate(session.date)} · {formatDuration(session.duration_minutes)}
                            {session.notes && ` · ${session.notes.slice(0, 50)}${session.notes.length > 50 ? "…" : ""}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          session.payment_status === "paid"
                            ? "bg-green-50 text-green-700"
                            : session.payment_status === "invoiced"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        )}>
                          {session.payment_status === "paid" ? "Paid" : session.payment_status === "invoiced" ? "Invoiced" : `${formatCurrency(session.amount_due)} unpaid`}
                        </span>
                        <ChevronRight size={14} className="text-ink-faint group-hover:text-ink transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Unpaid balance */}
            {drawer === "unpaid" && (
              <div className="divide-y divide-surface-border">
                {unpaidByStudent.length === 0 && (
                  <p className="text-sm text-ink-muted text-center py-8">No unpaid balances.</p>
                )}
                {unpaidByStudent.map(({ student, unpaidSessions, total }) => (
                  <div key={student.id} className="px-5 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link
                          href={`/students/${student.id}`}
                          className="text-sm font-medium text-ink hover:text-brand-teal transition-colors"
                        >
                          {student.name}
                        </Link>
                        <p className="text-xs text-ink-faint mt-0.5">{student.parent_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold font-mono text-amber-700">
                          {formatCurrency(total, student.currency)}
                        </span>
                        <button
                          onClick={() => copyReminder(student, total)}
                          className="flex items-center gap-1.5 text-xs text-ink-muted border border-surface-border px-2.5 py-1 rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          {copiedId === student.id
                            ? <><CheckCheck size={11} className="text-green-600" /> Copied</>
                            : <><Copy size={11} /> Send reminder</>
                          }
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 pl-1">
                      {unpaidSessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs text-ink-faint">
                          <span>{formatDate(s.date)} · {formatDuration(s.duration_minutes)}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium",
                              s.payment_status === "invoiced" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {s.payment_status}
                            </span>
                            <span className="font-mono">{formatCurrency(s.amount_due)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Monthly revenue */}
            {drawer === "revenue" && (
              <div className="divide-y divide-surface-border">
                {revenueByStudent.length === 0 && (
                  <p className="text-sm text-ink-muted text-center py-8">No payments received this month.</p>
                )}
                {revenueByStudent.map(({ student, studentPayments, total }) => (
                  <div key={student.id} className="px-5 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link
                          href={`/students/${student.id}`}
                          className="text-sm font-medium text-ink hover:text-brand-teal transition-colors"
                        >
                          {student.name}
                        </Link>
                        <p className="text-xs text-ink-faint mt-0.5">{student.subjects.join(", ")}</p>
                      </div>
                      <span className="text-sm font-semibold font-mono text-green-700">
                        {formatCurrency(total, student.currency)}
                      </span>
                    </div>
                    <div className="space-y-1 pl-1">
                      {studentPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-ink-faint">
                          <span>{formatDate(p.paid_at)} · {p.method}</span>
                          <div className="flex items-center gap-2">
                            {p.note && <span className="text-ink-faint italic">{p.note}</span>}
                            <span className="font-mono text-green-700">{formatCurrency(p.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Needs follow-up */}
          <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Needs follow-up</p>
              <span className="text-xs text-ink-faint">{needsFollowUp.length} student{needsFollowUp.length !== 1 ? "s" : ""}</span>
            </div>
            {needsFollowUp.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">All caught up!</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {needsFollowUp.map(({ student, days }) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-muted/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{student.name}</p>
                      <p className="text-xs text-ink-faint mt-0.5">{student.subjects.join(", ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={student.status} />
                      <span className={`text-xs font-medium ${days >= 14 ? "text-red-500" : "text-amber-600"}`}>
                        {days === 999 ? "Never" : `${days}d ago`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Recent sessions</p>
              <span className="text-xs text-ink-faint">Today &amp; yesterday</span>
            </div>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">No sessions today or yesterday.</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {recentSessions.map((session) => {
                  const student = getStudent(session.student_id);
                  return (
                    <Link
                      key={session.id}
                      href={`/students/${session.student_id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-surface-muted/60 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{student?.name ?? "Unknown"}</p>
                        <p className="text-xs text-ink-faint mt-0.5">
                          {formatDate(session.date)} · {session.duration_minutes}m
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", MOOD_DOT[session.mood])} />
                        {session.payment_status !== "paid" && (
                          <span className="text-xs text-amber-600 font-medium">
                            {formatCurrency(session.amount_due)} unpaid
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({
  icon, label, value, iconColor, iconBg, onClick, active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white border rounded-xl p-4 text-left w-full transition-all hover:shadow-sm",
        active ? "border-brand-teal ring-2 ring-brand-teal/20" : "border-surface-border hover:border-ink-faint"
      )}
    >
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${iconBg} ${iconColor} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-ink font-mono">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-ink-faint">{label}</p>
        <ChevronRight size={12} className={cn("transition-colors", active ? "text-brand-teal" : "text-ink-faint")} />
      </div>
    </button>
  );
}
