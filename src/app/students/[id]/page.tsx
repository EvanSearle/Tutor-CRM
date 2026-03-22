"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, CheckCheck, ChevronDown } from "lucide-react";
import type { Student, Session, Payment, StudentStatus } from "@/types";
import { getStudentById, updateStudentStatus } from "@/lib/queries/students";
import { getSessionsByStudentId, markSessionPaid, addSession } from "@/lib/queries/sessions";
import { getPaymentsByStudentId } from "@/lib/queries/payments";
import { updateStudent } from "@/lib/queries/students";
import { SessionLogForm } from "@/components/sessions/SessionLogForm";
import { SessionItem } from "@/components/sessions/SessionItem";
import { StudentForm } from "@/components/students/StudentForm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "sessions" | "details" | "payments";

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("sessions");
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      getStudentById(id),
      getSessionsByStudentId(id),
      getPaymentsByStudentId(id),
    ]).then(([s, sess, pays]) => {
      setStudent(s);
      setSessions(sess);
      setPayments(pays);
      setLoading(false);
    });
  }, [id]);

  function handleAddSession(session: Session) {
    addSession(session);
    setSessions((prev) => [session, ...prev]);
  }

  function handleMarkPaid(sessionId: string) {
    markSessionPaid(sessionId);
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, payment_status: "paid" as const } : s))
    );
  }

  async function handleSaveStudent(updated: Student) {
    await updateStudent(updated);
    setStudent(updated);
    setEditOpen(false);
  }

  async function handleStageChange(newStatus: StudentStatus) {
    if (!student || student.status === newStatus) return;
    await updateStudentStatus(student.id, newStatus);
    setStudent({ ...student, status: newStatus });
  }

  function copyPaymentReminder() {
    if (!student) return;
    const balance = sessions
      .filter((s) => s.payment_status === "unpaid" || s.payment_status === "invoiced")
      .reduce((sum, s) => sum + s.amount_due, 0);
    const msg = `Hi ${student.parent_name}, just a reminder that ${student.name} has an outstanding balance of ${formatCurrency(balance, student.currency)}. Please let me know if you have any questions!`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-32 bg-surface-border rounded" />
        <div className="h-8 w-48 bg-surface-border rounded" />
        <div className="h-4 w-64 bg-surface-muted rounded" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-muted">Student not found.</p>
        <button onClick={() => router.push("/students")} className="mt-3 text-brand-teal text-sm hover:underline">
          Back to students
        </button>
      </div>
    );
  }

  const totalBilled = sessions.reduce((sum, s) => sum + s.amount_due, 0);
  const totalPaid = sessions
    .filter((s) => s.payment_status === "paid")
    .reduce((sum, s) => sum + s.amount_due, 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push("/students")}
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Students
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-ink">{student.name}</h1>
            <StageDropdown status={student.status} onChange={handleStageChange} />
          </div>
          <p className="text-sm text-ink-muted">
            {student.grade && <span>{student.grade} · </span>}
            {student.subjects.join(", ")}
          </p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="px-3 py-1.5 text-sm font-medium border border-surface-border rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
        >
          Edit
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-surface-border mb-6">
        {(["sessions", "details", "payments"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors -mb-px",
              activeTab === tab
                ? "border-brand-teal text-brand-teal"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sessions tab */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <SessionLogForm
            studentId={student.id}
            hourlyRate={student.hourly_rate}
            onSave={handleAddSession}
          />

          <div className="bg-white border border-surface-border rounded-xl px-4 py-1">
            <p className="text-xs font-medium text-ink-faint uppercase tracking-wide py-3 border-b border-surface-border">
              Session history ({sessions.length})
            </p>
            {sessions.length === 0 ? (
              <p className="text-sm text-ink-muted py-8 text-center">No sessions logged yet.</p>
            ) : (
              sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  currency={student.currency}
                  onMarkPaid={handleMarkPaid}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Details tab */}
      {activeTab === "details" && (
        <div className="bg-white border border-surface-border rounded-xl p-5 space-y-5">
          <Section title="Student">
            <Grid>
              <Field label="Name" value={student.name} />
              <Field label="Grade" value={student.grade} />
              <Field label="Subjects" value={student.subjects.join(", ")} />
              <Field label="Email" value={student.student_email} />
              <Field label="Hourly rate" value={formatCurrency(student.hourly_rate, student.currency) + "/h"} />
              <Field label="Source" value={student.source} />
            </Grid>
          </Section>

          <hr className="border-surface-border" />

          <Section title="Parent / Guardian">
            <Grid>
              <Field label="Name" value={student.parent_name} />
              <Field label="Phone" value={student.parent_phone} />
              <Field label="Email" value={student.parent_email} />
            </Grid>
          </Section>

          {student.notes && (
            <>
              <hr className="border-surface-border" />
              <Section title="Notes">
                <p className="text-sm text-ink-muted leading-relaxed">{student.notes}</p>
              </Section>
            </>
          )}

          {student.tags.length > 0 && (
            <>
              <hr className="border-surface-border" />
              <Section title="Tags">
                <div className="flex gap-1.5 flex-wrap">
                  {student.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-1 bg-surface-muted text-ink-muted rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      )}

      {/* Payments tab */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Total billed" value={formatCurrency(totalBilled, student.currency)} />
            <MetricCard label="Total paid" value={formatCurrency(totalPaid, student.currency)} highlight="green" />
            <MetricCard label="Outstanding" value={formatCurrency(outstanding, student.currency)} highlight={outstanding > 0 ? "amber" : undefined} />
          </div>

          {/* Reminder button */}
          <button
            onClick={copyPaymentReminder}
            className="flex items-center gap-2 text-sm text-ink-muted border border-surface-border px-4 py-2 rounded-lg hover:bg-surface-muted transition-colors"
          >
            {copied ? <CheckCheck size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy payment reminder"}
          </button>

          {/* Payment history */}
          <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
            <p className="text-xs font-medium text-ink-faint uppercase tracking-wide px-4 py-3 border-b border-surface-border">
              Payment history
            </p>
            {payments.length === 0 ? (
              <p className="text-sm text-ink-muted py-8 text-center">No payments recorded.</p>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="px-4 py-3.5 border-b border-surface-border last:border-0 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-ink">{formatCurrency(payment.amount, payment.currency)}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {payment.method} · {formatDate(payment.paid_at)}
                    </p>
                    {payment.note && <p className="text-xs text-ink-muted mt-0.5">{payment.note}</p>}
                  </div>
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                    Received
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit student modal */}
      <StudentForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveStudent}
        initial={student}
      />
    </div>
  );
}

// ── Stage dropdown ──────────────────────────────────────────────────────────

const STAGE_OPTIONS: { value: StudentStatus; label: string; styles: string }[] = [
  { value: "prospect", label: "Prospect", styles: "bg-status-prospect-bg text-status-prospect-text" },
  { value: "trial",    label: "Trial",    styles: "bg-status-trial-bg text-status-trial-text"       },
  { value: "active",   label: "Active",   styles: "bg-status-active-bg text-status-active-text"     },
  { value: "paused",   label: "Paused",   styles: "bg-status-paused-bg text-status-paused-text"     },
  { value: "churned",  label: "Churned",  styles: "bg-status-churned-bg text-status-churned-text"   },
];

function StageDropdown({
  status,
  onChange,
}: {
  status: StudentStatus;
  onChange: (s: StudentStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STAGE_OPTIONS.find((o) => o.value === status)!;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80",
          current.styles
        )}
      >
        {current.label}
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-36 bg-white border border-surface-border rounded-xl shadow-lg overflow-hidden py-1">
          {STAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-surface-muted",
                opt.value === status ? "font-medium" : "text-ink-muted"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", opt.styles)} />
              {opt.label}
              {opt.value === status && <span className="ml-auto text-brand-teal text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-faint uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="text-sm text-ink mt-0.5">{value || "—"}</p>
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "amber" }) {
  return (
    <div className={cn(
      "bg-white border rounded-xl px-4 py-4",
      highlight === "green" ? "border-green-200" : highlight === "amber" ? "border-amber-200" : "border-surface-border"
    )}>
      <p className="text-xs text-ink-faint mb-1">{label}</p>
      <p className={cn(
        "text-xl font-semibold font-mono",
        highlight === "green" ? "text-green-700" : highlight === "amber" ? "text-amber-700" : "text-ink"
      )}>
        {value}
      </p>
    </div>
  );
}
