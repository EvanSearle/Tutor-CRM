"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, ChevronRight, ChevronDown } from "lucide-react";
import type { Reminder, Student } from "@/types";
import { getReminders, addReminder, toggleReminder, deleteReminder } from "@/lib/queries/reminders";
import { getStudents } from "@/lib/queries/students";
import { inputCls } from "@/lib/styles";
import { cn } from "@/lib/utils";

const STALE_DAYS = 30;

function relativeDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "today";
  const diff = Math.round(
    (new Date(dateStr).getTime() - new Date(today).getTime()) / 86_400_000
  );
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
}

function ReminderRow({
  reminder,
  studentName,
  studentId,
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  studentName: string;
  studentId: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/50 group">
      <input
        type="checkbox"
        checked={reminder.completed}
        onChange={() => onToggle(reminder.id)}
        className="w-4 h-4 rounded border-surface-border accent-brand-teal cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <Link
          href={`/students/${studentId}`}
          className="text-sm font-medium text-ink hover:text-brand-teal transition-colors"
        >
          {studentName}
        </Link>
        <p className={cn(
          "text-xs mt-0.5 truncate",
          reminder.completed ? "text-ink-faint line-through" : "text-ink-muted"
        )}>
          {reminder.note}
        </p>
      </div>
      <span className={cn(
        "text-xs flex-shrink-0 tabular-nums",
        reminder.completed
          ? "text-ink-faint"
          : reminder.due_date < today
            ? "text-red-500 font-medium"
            : "text-ink-faint"
      )}>
        {relativeDate(reminder.due_date)}
      </span>
      <button
        onClick={() => onDelete(reminder.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-ink-faint hover:text-red-500 flex-shrink-0"
        aria-label="Delete reminder"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function Section({
  title,
  count,
  reminders,
  students,
  onToggle,
  onDelete,
  titleCls,
  collapsible,
  defaultExpanded = true,
}: {
  title: string;
  count: number;
  reminders: Reminder[];
  students: Student[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  titleCls?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (count === 0) return null;
  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));

  return (
    <div className="border border-surface-border rounded-xl overflow-hidden">
      <button
        onClick={collapsible ? () => setExpanded((v) => !v) : undefined}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 bg-surface-muted border-b border-surface-border",
          collapsible && "cursor-pointer hover:bg-surface-border/30 transition-colors"
        )}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            expanded
              ? <ChevronDown size={14} className="text-ink-faint" />
              : <ChevronRight size={14} className="text-ink-faint" />
          )}
          <span className={cn("text-xs font-semibold uppercase tracking-wide", titleCls ?? "text-ink-muted")}>
            {title}
          </span>
        </div>
        <span className={cn("text-xs font-semibold tabular-nums", titleCls ?? "text-ink-muted")}>
          {count}
        </span>
      </button>
      {expanded && (
        <div className="divide-y divide-surface-border bg-white">
          {reminders.map((r) => {
            const student = studentMap[r.student_id];
            return (
              <ReminderRow
                key={r.id}
                reminder={r}
                studentName={student?.name ?? "Unknown student"}
                studentId={r.student_id}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const [formStudentId, setFormStudentId] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    Promise.all([getReminders(), getStudents()])
      .then(([fetchedReminders, fetchedStudents]) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - STALE_DAYS);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const stale = fetchedReminders.filter(
          (r) => r.completed && r.due_date < cutoffStr
        );
        stale.forEach((r) => deleteReminder(r.id).catch(console.error));
        const staleIds = new Set(stale.map((r) => r.id));

        setReminders(fetchedReminders.filter((r) => !staleIds.has(r.id)));
        setStudents(fetchedStudents);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const { overdue, todayArr, upcoming, completed } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = reminders.filter((r) => !r.completed);
    return {
      overdue: active.filter((r) => r.due_date < today),
      todayArr: active.filter((r) => r.due_date === today),
      upcoming: active.filter((r) => r.due_date > today),
      completed: reminders.filter((r) => r.completed),
    };
  }, [reminders]);

  function handleToggle(id: string) {
    toggleReminder(id).catch(console.error);
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  }

  function handleDelete(id: string) {
    deleteReminder(id).catch(console.error);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formStudentId || !formNote.trim()) return;

    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      student_id: formStudentId,
      tutor_id: "t1",
      note: formNote.trim(),
      due_date: formDueDate,
      completed: false,
      created_at: new Date().toISOString(),
    };

    addReminder(newReminder).catch(console.error);
    setReminders((prev) => [newReminder, ...prev]);
    setFormOpen(false);
    setFormNote("");
    setFormStudentId("");
    setFormDueDate(new Date().toISOString().slice(0, 10));
  }

  const activeCount = overdue.length + todayArr.length + upcoming.length;
  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-36 bg-surface-border rounded" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reminders</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {activeCount} active{completed.length > 0 ? ` · ${completed.length} completed` : ""}
          </p>
        </div>
        <Dialog.Root open={formOpen} onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setFormNote("");
            setFormStudentId("");
            setFormDueDate(new Date().toISOString().slice(0, 10));
          }
        }}>
          <Dialog.Trigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-lg hover:bg-brand-teal-dark transition-colors">
              <Plus size={16} />
              Add reminder
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-base font-semibold text-ink">Add reminder</Dialog.Title>
                <Dialog.Close className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors" aria-label="Close">
                  <X size={16} />
                </Dialog.Close>
              </div>
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">Student</label>
                  <select
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    required
                    className={inputCls}
                  >
                    <option value="">Select a student…</option>
                    {sortedStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">Note</label>
                  <textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="What do you need to follow up on?"
                    required
                    rows={3}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">Due date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink rounded-lg hover:bg-surface-muted transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark transition-colors"
                  >
                    Add reminder
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-ink-muted text-sm">No reminders</p>
          <p className="text-ink-faint text-xs mt-1">Add one to keep track of follow-ups</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Section
            title="Overdue"
            count={overdue.length}
            reminders={overdue}
            students={students}
            onToggle={handleToggle}
            onDelete={handleDelete}
            titleCls="text-red-600"
          />
          <Section
            title="Today"
            count={todayArr.length}
            reminders={todayArr}
            students={students}
            onToggle={handleToggle}
            onDelete={handleDelete}
            titleCls="text-amber-600"
          />
          <Section
            title="Upcoming"
            count={upcoming.length}
            reminders={upcoming}
            students={students}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
          <Section
            title="Completed"
            count={completed.length}
            reminders={completed}
            students={students}
            onToggle={handleToggle}
            onDelete={handleDelete}
            collapsible
            defaultExpanded={false}
          />
        </div>
      )}
    </div>
  );
}
