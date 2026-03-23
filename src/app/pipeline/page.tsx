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
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Student, StudentStatus, Session } from "@/types";
import { getStudents, updateStudentStatus } from "@/lib/queries/students";
import { MOCK_SESSIONS } from "@/lib/mock/data";
import { formatCurrency, daysSince } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COLUMNS: { key: StudentStatus; label: string; color: string; headerBg: string }[] = [
  { key: "prospect", label: "Prospect", color: "text-purple-700", headerBg: "bg-purple-50 border-purple-100" },
  { key: "trial",    label: "Trial",    color: "text-blue-700",   headerBg: "bg-blue-50 border-blue-100"   },
  { key: "active",   label: "Active",   color: "text-teal-700",   headerBg: "bg-teal-50 border-teal-100"   },
  { key: "churned",  label: "Churned",  color: "text-red-700",    headerBg: "bg-red-50 border-red-100"     },
];

function visualColumn(status: StudentStatus): StudentStatus {
  return status === "paused" ? "active" : status;
}

// ── Card content (shared between sortable card + overlay) ───────────────────
function StudentCard({ student, sessions }: { student: Student; sessions: Session[] }) {
  const last = sessions
    .filter((s) => s.student_id === student.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  const unpaid = sessions
    .filter((s) => s.student_id === student.id && (s.payment_status === "unpaid" || s.payment_status === "invoiced"))
    .reduce((sum, s) => sum + s.amount_due, 0);

  return (
    <div className="bg-white border border-surface-border rounded-lg p-3 cursor-grab active:cursor-grabbing select-none shadow-sm">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link
          href={`/students/${student.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-medium text-ink hover:text-brand-teal transition-colors leading-snug"
        >
          {student.name}
        </Link>
        {student.status === "paused" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
            Paused
          </span>
        )}
      </div>
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

// ── Sortable card ────────────────────────────────────────────────────────────
function SortableCard({ student, sessions }: { student: Student; sessions: Session[] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="relative pointer-events-none">
        {/* invisible preserves exact card height in layout */}
        <div className="invisible">
          <StudentCard student={student} sessions={sessions} />
        </div>
        {/* dashed outline sits on top at the same size */}
        <div className="absolute inset-0 border-2 border-dashed border-brand-teal/50 rounded-lg bg-brand-teal/5" />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <StudentCard student={student} sessions={sessions} />
    </div>
  );
}

// ── Droppable column ─────────────────────────────────────────────────────────
function Column({
  col,
  students,
  sessions,
}: {
  col: typeof COLUMNS[number];
  students: Student[];
  sessions: Session[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const studentIds = students.map((s) => s.id);

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
        <SortableContext items={studentIds} strategy={verticalListSortingStrategy}>
          {students.length === 0 && (
            <p className="text-xs text-ink-faint text-center py-6">No students</p>
          )}
          {students.map((student) => (
            <SortableCard key={student.id} student={student} sessions={sessions} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsSnapshot, setStudentsSnapshot] = useState<Student[]>([]);
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
    }).catch(console.error);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setStudentsSnapshot([...students]);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeStudent = students.find((s) => s.id === activeId);
    if (!activeStudent) return;

    const overIsColumn = COLUMNS.some((c) => c.key === overId);
    const rawOverColumnKey: StudentStatus = overIsColumn
      ? (overId as StudentStatus)
      : (students.find((s) => s.id === overId)?.status ?? activeStudent.status);
    // Treat paused students as belonging to the active column
    const overColumnKey = visualColumn(rawOverColumnKey);
    const activeColumnKey = visualColumn(activeStudent.status);

    setStudents((prev) => {
      const activeIndex = prev.findIndex((s) => s.id === activeId);

      if (overIsColumn) {
        // Hovering over an empty column — just change status
        if (activeColumnKey === overColumnKey) return prev;
        return prev.map((s) => s.id === activeId ? { ...s, status: overColumnKey } : s);
      }

      const overIndex = prev.findIndex((s) => s.id === overId);
      if (overIndex === -1) return prev;

      if (activeColumnKey === overColumnKey) {
        // Same column — reorder (preserve existing status, including "paused")
        return arrayMove(prev, activeIndex, overIndex);
      }

      // Cross-column — change status then move to insertion point
      const updated = prev.map((s) => s.id === activeId ? { ...s, status: overColumnKey } : s);
      const newActiveIndex = updated.findIndex((s) => s.id === activeId);
      const newOverIndex = updated.findIndex((s) => s.id === overId);
      return arrayMove(updated, newActiveIndex, newOverIndex);
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const studentId = String(event.active.id);
    setActiveId(null);
    const finalStudent = students.find((s) => s.id === studentId);
    if (!finalStudent) return;
    try {
      await updateStudentStatus(studentId, finalStudent.status);
    } catch (err) {
      console.error(err);
      setStudents(studentsSnapshot);
    }
  }

  function handleDragCancel() {
    setStudents(studentsSnapshot);
    setActiveId(null);
  }

  const activeStudent = students.find((s) => s.id === activeId) ?? null;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-32 bg-surface-border rounded" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
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
          {students.length} student{students.length !== 1 ? "s" : ""} · drag cards between stages or reorder within a stage
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              col={col}
              students={col.key === "active"
                ? students.filter((s) => s.status === "active" || s.status === "paused")
                : students.filter((s) => s.status === col.key)}
              sessions={sessions}
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
