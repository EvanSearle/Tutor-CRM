"use client";

import { useRouter } from "next/navigation";
import type { Student, Session } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatDate, daysSince } from "@/lib/utils";

interface StudentTableProps {
  students: Student[];
  sessions: Session[];
}

function getLastSession(studentId: string, sessions: Session[]): Session | null {
  const studentSessions = sessions
    .filter((s) => s.student_id === studentId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return studentSessions[0] ?? null;
}

function getUnpaidBalance(studentId: string, sessions: Session[]): number {
  return sessions
    .filter((s) => s.student_id === studentId && (s.payment_status === "unpaid" || s.payment_status === "invoiced"))
    .reduce((sum, s) => sum + s.amount_due, 0);
}

export function StudentTable({ students, sessions }: StudentTableProps) {
  const router = useRouter();

  if (students.length === 0) {
    return (
      <div className="text-center py-16 text-ink-muted">
        <p className="text-sm">No students found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-muted">
            <th className="text-left px-4 py-3 text-xs font-medium text-ink-faint uppercase tracking-wide">Student</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-ink-faint uppercase tracking-wide">Subject</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-ink-faint uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-ink-faint uppercase tracking-wide">Rate</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-ink-faint uppercase tracking-wide">Last session</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-ink-faint uppercase tracking-wide">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {students.map((student) => {
            const lastSession = getLastSession(student.id, sessions);
            const balance = getUnpaidBalance(student.id, sessions);

            return (
              <tr
                key={student.id}
                onClick={() => router.push(`/students/${student.id}`)}
                className="hover:bg-surface-muted/60 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3.5">
                  <p className="font-medium text-ink">{student.name}</p>
                  {student.parent_name && (
                    <p className="text-xs text-ink-faint mt-0.5">{student.parent_name}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-ink-muted">
                  {student.subjects.join(", ") || "—"}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={student.status} />
                </td>
                <td className="px-4 py-3.5 text-ink-muted font-mono text-xs">
                  {formatCurrency(student.hourly_rate, student.currency)}/h
                </td>
                <td className="px-4 py-3.5">
                  {lastSession ? (
                    <span className={daysSince(lastSession.date) > 14 ? "text-amber-600" : "text-ink-muted"}>
                      {daysSince(lastSession.date) === 0
                        ? "Today"
                        : daysSince(lastSession.date) === 1
                        ? "Yesterday"
                        : `${daysSince(lastSession.date)}d ago`}
                    </span>
                  ) : (
                    <span className="text-ink-faint">Never</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {balance > 0 ? (
                    <span className="font-mono text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {formatCurrency(balance, student.currency)}
                    </span>
                  ) : (
                    <span className="text-ink-faint text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { formatDate };
