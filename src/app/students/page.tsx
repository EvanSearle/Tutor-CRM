"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import type { Student, StudentStatus, Session } from "@/types";
import { getStudents, addStudent, updateStudent } from "@/lib/queries/students";
import { StudentTable } from "@/components/students/StudentTable";
import { StudentForm } from "@/components/students/StudentForm";
import { MOCK_SESSIONS } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

type FilterTab = "all" | StudentStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "prospect", label: "Prospect" },
  { key: "paused", label: "Paused" },
  { key: "churned", label: "Churned" },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    getStudents().then((data) => {
      setStudents(data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: students.length };
    for (const s of students) {
      c[s.status] = (c[s.status] ?? 0) + 1;
    }
    return c;
  }, [students]);

  const filtered = useMemo(() => {
    let result = students;
    if (activeTab !== "all") result = result.filter((s) => s.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.parent_name.toLowerCase().includes(q) ||
          s.subjects.some((sub) => sub.toLowerCase().includes(q))
      );
    }
    return result;
  }, [students, activeTab, search]);

  async function handleSaveStudent(student: Student) {
    const existing = students.find((s) => s.id === student.id);
    if (existing) {
      await updateStudent(student);
      setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
    } else {
      await addStudent(student);
      setStudents((prev) => [student, ...prev]);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Students</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {loading ? "Loading…" : `${students.length} student${students.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-lg hover:bg-brand-teal-dark transition-colors"
        >
          <Plus size={16} />
          Add student
        </button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full font-medium transition-colors",
                activeTab === key
                  ? "bg-brand-teal text-white"
                  : "bg-surface-muted text-ink-muted hover:text-ink"
              )}
            >
              {label}
              {counts[key] !== undefined && (
                <span className={cn("ml-1.5 text-xs", activeTab === key ? "opacity-80" : "opacity-60")}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <StudentTableSkeleton />
      ) : (
        <StudentTable students={filtered} sessions={sessions} />
      )}

      {/* Add student modal */}
      <StudentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveStudent}
      />
    </div>
  );
}

function StudentTableSkeleton() {
  return (
    <div className="rounded-xl border border-surface-border overflow-hidden bg-white">
      <div className="border-b border-surface-border bg-surface-muted px-4 py-3 flex gap-4">
        {["w-32", "w-24", "w-20", "w-16", "w-28", "w-16"].map((w, i) => (
          <div key={i} className={`h-3 ${w} bg-surface-border rounded animate-pulse`} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-b border-surface-border flex gap-4 items-center">
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 bg-surface-border rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-surface-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-20 bg-surface-border rounded animate-pulse" />
          <div className="h-5 w-16 bg-surface-border rounded-full animate-pulse" />
          <div className="h-3 w-14 bg-surface-border rounded animate-pulse" />
          <div className="h-3 w-16 bg-surface-border rounded animate-pulse" />
          <div className="h-5 w-16 bg-surface-border rounded-full animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}
