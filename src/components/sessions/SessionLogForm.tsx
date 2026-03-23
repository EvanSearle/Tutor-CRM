"use client";

import { useState } from "react";
import type { Session, Mood, PaymentStatus } from "@/types";
import { generateId, cn } from "@/lib/utils";
import { inputCls } from "@/lib/styles";

interface SessionLogFormProps {
  studentId: string;
  hourlyRate: number;
  onSave: (session: Session) => void;
  initialSession?: Session;
  onCancel?: () => void;
}

const MOODS: { value: Mood; label: string; color: string }[] = [
  { value: "good", label: "Good", color: "bg-green-100 text-green-700 border-green-200 data-[active=true]:bg-green-600 data-[active=true]:text-white data-[active=true]:border-green-600" },
  { value: "okay", label: "Okay", color: "bg-amber-50 text-amber-700 border-amber-200 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500" },
  { value: "tough", label: "Tough", color: "bg-red-50 text-red-700 border-red-200 data-[active=true]:bg-red-500 data-[active=true]:text-white data-[active=true]:border-red-500" },
];

export function SessionLogForm({ studentId, hourlyRate, onSave, initialSession, onCancel }: SessionLogFormProps) {
  const isEdit = !!initialSession;
  const [date, setDate] = useState(initialSession?.date ?? new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState(initialSession ? String(initialSession.duration_minutes) : "");
  const [notes, setNotes] = useState(initialSession?.notes ?? "");
  const [mood, setMood] = useState<Mood>(initialSession?.mood ?? "good");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(initialSession?.payment_status ?? "unpaid");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const durationMins = parseInt(duration) || 60;
    const amountDue = (durationMins / 60) * hourlyRate;

    const session: Session = isEdit
      ? {
          ...initialSession,
          date,
          duration_minutes: durationMins,
          notes: notes.trim(),
          mood,
          payment_status: paymentStatus,
          amount_due: Math.round(amountDue * 100) / 100,
        }
      : {
          id: generateId(),
          student_id: studentId,
          tutor_id: "t1",
          date,
          duration_minutes: durationMins,
          notes: notes.trim(),
          mood,
          payment_status: paymentStatus,
          amount_due: Math.round(amountDue * 100) / 100,
          created_at: new Date().toISOString(),
        };

    onSave(session);

    if (!isEdit) {
      // Reset only for create mode
      setDuration("");
      setNotes("");
      setMood("good");
      setPaymentStatus("unpaid");
    }
    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-surface-border rounded-xl p-4 space-y-4"
    >
      <p className="text-sm font-medium text-ink">{isEdit ? "Edit session" : "Log a session"}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-muted">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-muted">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="1"
            placeholder="60"
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-ink-muted">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="How did the session go? What was covered?"
          className={cn(inputCls, "resize-none")}
        />
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-muted">Mood</label>
          <div className="flex gap-1.5">
            {MOODS.map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                data-active={mood === value}
                onClick={() => setMood(value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
                  color
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-muted">Payment</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            className={cn(inputCls, "py-1")}
          >
            <option value="unpaid">Unpaid</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="mt-auto ml-auto flex items-center gap-2">
          {isEdit && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 text-sm font-medium border border-surface-border rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-brand-teal text-white text-sm font-medium rounded-lg hover:bg-brand-teal-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save session"}
          </button>
        </div>
      </div>
    </form>
  );
}

