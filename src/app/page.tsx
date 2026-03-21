"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, CalendarCheck, AlertCircle, TrendingUp } from "lucide-react";
import type { Student, Session, DashboardMetrics } from "@/types";
import { getStudents } from "@/lib/queries/students";
import { getDashboardMetrics } from "@/lib/mock";
import { MOCK_SESSIONS } from "@/lib/mock/data";
import { formatCurrency, daysSince, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/students/StatusBadge";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardMetrics(), getStudents()]).then(([m, s]) => {
      setMetrics(m);
      setStudents(s);
      setLoading(false);
    });
  }, []);

  // Students with no session in 7+ days (active only)
  const needsFollowUp = students
    .filter((s) => s.status === "active" || s.status === "trial")
    .map((s) => {
      const lastSession = sessions
        .filter((sess) => sess.student_id === s.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const days = lastSession ? daysSince(lastSession.date) : 999;
      return { student: s, lastSession, days };
    })
    .filter(({ days }) => days >= 7)
    .sort((a, b) => b.days - a.days);

  // Sessions from today or yesterday (mock: within last 2 days)
  const recentSessions = sessions
    .filter((s) => daysSince(s.date) <= 1)
    .sort((a, b) => b.date.localeCompare(a.date));

  function getStudentName(studentId: string) {
    return students.find((s) => s.id === studentId)?.name ?? "Unknown";
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-40 bg-surface-border rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
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
          />
          <MetricCard
            icon={<CalendarCheck size={16} />}
            label="Sessions this week"
            value={String(metrics.sessions_this_week)}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <MetricCard
            icon={<AlertCircle size={16} />}
            label="Unpaid balance"
            value={formatCurrency(metrics.unpaid_balance)}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <MetricCard
            icon={<TrendingUp size={16} />}
            label="Monthly revenue"
            value={formatCurrency(metrics.monthly_revenue)}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
        </div>
      )}

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
                const studentId = session.student_id;
                return (
                  <Link
                    key={session.id}
                    href={`/students/${studentId}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-muted/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{getStudentName(studentId)}</p>
                      <p className="text-xs text-ink-faint mt-0.5">
                        {formatDate(session.date)} · {session.duration_minutes}m
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MoodDot mood={session.mood} />
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
  );
}

function MetricCard({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${iconBg} ${iconColor} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-ink font-mono">{value}</p>
      <p className="text-xs text-ink-faint mt-1">{label}</p>
    </div>
  );
}

function MoodDot({ mood }: { mood: Session["mood"] }) {
  const colors = { good: "bg-green-500", okay: "bg-amber-400", tough: "bg-red-400" };
  return <span className={`w-2 h-2 rounded-full ${colors[mood]} inline-block`} />;
}
