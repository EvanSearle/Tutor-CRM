"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Student, StudentStatus } from "@/types";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUSES: StudentStatus[] = ["prospect", "trial", "active", "paused", "churned"];

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  initial?: Student;
}

const EMPTY_FORM = {
  name: "",
  grade: "",
  subjects: "",
  student_email: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  hourly_rate: "",
  currency: "CAD",
  status: "prospect" as StudentStatus,
  source: "",
  notes: "",
  tags: "",
};

export function StudentForm({ open, onClose, onSave, initial }: StudentFormProps) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...EMPTY_FORM,
          name: initial.name,
          grade: initial.grade,
          subjects: initial.subjects.join(", "),
          student_email: initial.student_email,
          parent_name: initial.parent_name,
          parent_email: initial.parent_email,
          parent_phone: initial.parent_phone,
          hourly_rate: String(initial.hourly_rate),
          currency: initial.currency,
          status: initial.status,
          source: initial.source,
          notes: initial.notes,
          tags: initial.tags.join(", "),
        }
      : EMPTY_FORM
  );

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const student: Student = {
      id: initial?.id ?? generateId(),
      tutor_id: "t1",
      name: form.name.trim(),
      grade: form.grade.trim(),
      subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
      student_email: form.student_email.trim(),
      parent_name: form.parent_name.trim(),
      parent_email: form.parent_email.trim(),
      parent_phone: form.parent_phone.trim(),
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      currency: form.currency,
      status: form.status,
      source: form.source.trim(),
      notes: form.notes.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      created_at: initial?.created_at ?? now,
      updated_at: now,
    };
    onSave(student);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-surface-border p-6 focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-ink">
              {initial ? "Edit Student" : "Add Student"}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-ink-faint hover:text-ink transition-colors rounded-md p-1"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Student name *">
                <input {...field("name")} required placeholder="Full name" className={inputCls} />
              </FormField>
              <FormField label="Grade">
                <input {...field("grade")} placeholder="e.g. Grade 10" className={inputCls} />
              </FormField>
            </div>

            <FormField label="Subjects">
              <input {...field("subjects")} placeholder="Math, Physics (comma-separated)" className={inputCls} />
            </FormField>

            <FormField label="Status">
              <select {...field("status")} className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Hourly rate">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
                  <input
                    {...field("hourly_rate")}
                    type="number"
                    min="0"
                    step="5"
                    placeholder="80"
                    className={cn(inputCls, "pl-7")}
                  />
                </div>
              </FormField>
              <FormField label="Currency">
                <select {...field("currency")} className={inputCls}>
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </FormField>
            </div>

            <hr className="border-surface-border" />

            <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">Parent / Guardian</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Parent name">
                <input {...field("parent_name")} placeholder="Full name" className={inputCls} />
              </FormField>
              <FormField label="Parent phone">
                <input {...field("parent_phone")} placeholder="416-555-0000" className={inputCls} />
              </FormField>
            </div>

            <FormField label="Parent email">
              <input {...field("parent_email")} type="email" placeholder="parent@email.com" className={inputCls} />
            </FormField>

            <hr className="border-surface-border" />

            <FormField label="Source">
              <input {...field("source")} placeholder="Referral, Website, Kijiji…" className={inputCls} />
            </FormField>

            <FormField label="Tags">
              <input {...field("tags")} placeholder="STEM, university-prep (comma-separated)" className={inputCls} />
            </FormField>

            <FormField label="Notes">
              <textarea
                {...field("notes")}
                rows={3}
                placeholder="Any additional context about this student…"
                className={cn(inputCls, "resize-none")}
              />
            </FormField>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-ink-muted border border-surface-border rounded-lg hover:bg-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-teal rounded-lg hover:bg-brand-teal-dark transition-colors"
              >
                {initial ? "Save changes" : "Add student"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors";
