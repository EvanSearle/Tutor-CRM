"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Student, StudentStatus, Session } from "@/types";
import { getStudents, updateStudentStatus } from "@/lib/queries/students";
import { MOCK_SESSIONS } from "@/lib/mock/data";
import { StatusBadge } from "@/components/students/StatusBadge";
import { formatCurrency, daysSince } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COLUMNS: { key: StudentStatus; label: string; color: string; headerBg: string }[] = [
  { key: "prospect",  label: "Prospect",  color: "text-purple-700", headerBg: "bg-purple-50 border-purple-100" },
  { key: "trial",     label: "Trial",     color: "text-blue-700",   headerBg: "bg-blue-50 border-blue-100"   },
  { key: "active",    label: "Active",    color: "text-teal-700",   headerBg: "bg-teal-50 border-teal-100"   },
  { key: "paused",    label: "Paused",    color: "text-amber-700",  headerBg: "bg-amber-50 border-amber-100" },
  { key: "churned",   label: "Churned",   color: "text-red-700",    headerBg: "bg-red-50 border-red-100"     },
];

const STATUS_ORDER = COLUMNS.map((c) => c.key);

export default function PipelinePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    getStudents().then((data) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  async function moveStudent(student: Student, direction: "left" | "right") {
    const currentIndex = STATUS_ORDER.indexOf(student.status);
    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= STATUS_ORDER.length) return;

    const newStatus = STATUS_ORDER[nextIndex];
    setMoving(student.id);
    await updateStudentStatus(student.id, newStatus);
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, status: newStatus } : s))
    );
    setMoving(null);
  }

  function getLastSession(studentId: string) {
    return sessions
      .filter((s) => s.student_id === studentId)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }

  function getUnpaidTotal(studentId: string) {
    return sessions
      .filter((s) => s.student_id === studentId && (s.payment_status === "unpaid" || s.payment_status === "invoiced"))
      .reduce((sum, s) => sum + s.amount_due, 0);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-32 bg-surface-border rounded" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-64 flex-shrink-0 h-64 bg-surface-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Pipeline</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {students.length} student{students.length !== 1 ? "s" : ""} · use arrows to move between stages
        </p>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {COLUMNS.map((col) => {
          const colStudents = students.filter((s) => s.status === col.key);
          return (
            <div key={col.key} className="flex-shrink-0 w-64 flex flex-col">
              {/* Column header */}
              <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0", col.headerBg)}>
                <span className={cn("text-xs font-semibold uppercase tracking-wide", col.color)}>
                  {col.label}
                </span>
                <span className={cn("text-xs font-semibold tabular-nums", col.color)}>
                  {colStudents.length}
                </span>
              </div>

              {/* Cards */}
              <div className="bg-surface-muted border border-surface-border rounded-b-xl p-2 space-y-2 min-h-[120px]">
                {colStudents.length === 0 && (
                  <p className="text-xs text-ink-faint text-center py-6">No students</p>
                )}
                {colStudents.map((student) => {
                  const last = getLastSession(student.id);
                  const unpaid = getUnpaidTotal(student.id);
                  const colIndex = STATUS_ORDER.indexOf(col.key);
                  const isMoving = moving === student.id;

                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "bg-white border border-surface-border rounded-lg p-3 transition-opacity",
                        isMoving && "opacity-40"
                      )}
                    >
                      {/* Name + link */}
                      <Link
                        href={`/students/${student.id}`}
                        className="text-sm font-medium text-ink hover:text-brand-teal transition-colors leading-snug block"
                      >
                        {student.name}
                      </Link>

                      {/* Grade & subjects */}
                      <p className="text-xs text-ink-faint mt-0.5">
                        {student.grade}
                        {student.subjects.length > 0 && ` · ${student.subjects.join(", ")}`}
                      </p>

                      {/* Source */}
                      {student.source && (
                        <p className="text-xs text-ink-faint mt-1">
                          via {student.source}
                        </p>
                      )}

                      {/* Last session */}
                      <p className="text-xs text-ink-faint mt-1.5">
                        {last
                          ? daysSince(last.date) === 0
                            ? "Last session: today"
                            : `Last session: ${daysSince(last.date)}d ago`
                          : "No sessions yet"}
                      </p>

                      {/* Unpaid badge */}
                      {unpaid > 0 && (
                        <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                          {formatCurrency(unpaid)} unpaid
                        </span>
                      )}

                      {/* Move arrows */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-surface-border">
                        <button
                          disabled={colIndex === 0 || isMoving}
                          onClick={() => moveStudent(student, "left")}
                          className="flex items-center gap-0.5 text-[11px] text-ink-faint hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors px-1 py-0.5 rounded hover:bg-surface-muted"
                        >
                          <ChevronLeft size={11} />
                          {COLUMNS[colIndex - 1]?.label ?? ""}
                        </button>
                        <button
                          disabled={colIndex === STATUS_ORDER.length - 1 || isMoving}
                          onClick={() => moveStudent(student, "right")}
                          className="flex items-center gap-0.5 text-[11px] text-ink-faint hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors px-1 py-0.5 rounded hover:bg-surface-muted"
                        >
                          {COLUMNS[colIndex + 1]?.label ?? ""}
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
