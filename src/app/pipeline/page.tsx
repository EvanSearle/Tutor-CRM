"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Student, StudentStatus, Session } from "@/types";
import { getStudents, updateStudentStatus } from "@/lib/queries/students";
import { MOCK_SESSIONS } from "@/lib/mock/data";
import { formatCurrency, daysSince } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COLUMNS: { key: StudentStatus; label: string; color: string; headerBg: string }[] = [
  { key: "prospect", label: "Prospect", color: "text-purple-700", headerBg: "bg-purple-50 border-purple-100" },
  { key: "trial",    label: "Trial",    color: "text-blue-700",   headerBg: "bg-blue-50 border-blue-100"   },
  { key: "active",   label: "Active",   color: "text-teal-700",   headerBg: "bg-teal-50 border-teal-100"   },
  { key: "paused",   label: "Paused",   color: "text-amber-700",  headerBg: "bg-amber-50 border-amber-100" },
  { key: "churned",  label: "Churned",  color: "text-red-700",    headerBg: "bg-red-50 border-red-100"     },
];

// ── Droppable column ────────────────────────────────────────────────────────
function Column({
  col,
  students,
  sessions,
  activeId,
}: {
  col: typeof COLUMNS[number];
  students: Student[];
  sessions: Session[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div className="flex-shrink-0 w-64 flex flex-col">
      <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0", col.headerBg)}>
        <span className={cn("text-xs font-semibold uppercase tracking-wide", col.color)}>{col.label}</span>
        <span className={cn("text-xs font-semibold tabular-nums", col.color)}>{students.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "border border-surface-border rounded-b-xl p-2 space-y-2 min-h-[120px] transition-colors",
          isOver ? "bg-brand-teal/5 border-brand-teal/30" : "bg-surface-muted"
        )}
      >
        {students.length === 0 && !isOver && (
          <p className="text-xs text-ink-faint text-center py-6">No students</p>
        )}
        {students.map((student) => (
          <DraggableCard
            key={student.id}
            student={student}
            sessions={sessions}
            isDragging={activeId === student.id}
          />
        ))}
      </div>
    </div>
  );
}

// ── Draggable card ──────────────────────────────────────────────────────────
function DraggableCard({
  student,
  sessions,
  isDragging,
}: {
  student: Student;
  sessions: Session[];
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: student.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-30")}
    >
      <StudentCard student={student} sessions={sessions} />
    </div>
  );
}

// ── Card content (shared between draggable + overlay) ───────────────────────
function StudentCard({ student, sessions }: { student: Student; sessions: Session[] }) {
  const last = sessions
    .filter((s) => s.student_id === student.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  const unpaid = sessions
    .filter((s) => s.student_id === student.id && (s.payment_status === "unpaid" || s.payment_status === "invoiced"))
    .reduce((sum, s) => sum + s.amount_due, 0);

  return (
    <div className="bg-white border border-surface-border rounded-lg p-3 cursor-grab active:cursor-grabbing select-none shadow-sm">
      <Link
        href={`/students/${student.id}`}
        onClick={(e) => e.stopPropagation()}
        className="text-sm font-medium text-ink hover:text-brand-teal transition-colors leading-snug block"
      >
        {student.name}
      </Link>
      <p className="text-xs text-ink-faint mt-0.5">
        {student.grade}{student.subjects.length > 0 && ` · ${student.subjects.join(", ")}`}
      </p>
      {student.source && (
        <p className="text-xs text-ink-faint mt-1">via {student.source}</p>
      )}
      <p className="text-xs text-ink-faint mt-1.5">
        {last
          ? daysSince(last.date) === 0
            ? "Last session: today"
            : `Last session: ${daysSince(last.date)}d ago`
          : "No sessions yet"}
      </p>
      {unpaid > 0 && (
        <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
          {formatCurrency(unpaid)} unpaid
        </span>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    getStudents().then((data) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const studentId = String(active.id);
    const newStatus = String(over.id) as StudentStatus;
    const student = students.find((s) => s.id === studentId);
    if (!student || student.status === newStatus) return;

    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
    await updateStudentStatus(studentId, newStatus);
  }

  const activeStudent = students.find((s) => s.id === activeId) ?? null;

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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Pipeline</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {students.length} student{students.length !== 1 ? "s" : ""} · drag cards between stages
        </p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              col={col}
              students={students.filter((s) => s.status === col.key)}
              sessions={sessions}
              activeId={activeId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeStudent && (
            <div className="w-64 rotate-1 scale-105 opacity-95 shadow-xl">
              <StudentCard student={activeStudent} sessions={sessions} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
