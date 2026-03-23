"use client";

import type { Session } from "@/types";
import { formatCurrency, formatDate, formatDuration } from "@/lib/utils";
import { MOOD_DOT } from "@/lib/styles";

const PAYMENT_BADGE: Record<Session["payment_status"], string> = {
  unpaid: "bg-amber-50 text-amber-700 border border-amber-200",
  invoiced: "bg-blue-50 text-blue-700 border border-blue-200",
  paid: "bg-green-50 text-green-700 border border-green-200",
};

const PAYMENT_LABEL: Record<Session["payment_status"], string> = {
  unpaid: "Unpaid",
  invoiced: "Invoiced",
  paid: "Paid",
};

interface SessionItemProps {
  session: Session;
  currency: string;
  onMarkPaid?: (id: string) => void;
  onEdit?: (session: Session) => void;
}

export function SessionItem({ session, currency, onMarkPaid, onEdit }: SessionItemProps) {
  return (
    <div className="flex gap-3 py-3.5 border-b border-surface-border last:border-0">
      {/* Mood dot */}
      <div className="pt-1 flex-shrink-0">
        <span className={`block w-2 h-2 rounded-full ${MOOD_DOT[session.mood]}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">{formatDate(session.date)}</p>
            <p className="text-xs text-ink-faint mt-0.5">{formatDuration(session.duration_minutes)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_BADGE[session.payment_status]}`}>
              {PAYMENT_LABEL[session.payment_status]}
            </span>
            <span className="text-xs font-mono text-ink-muted">
              {formatCurrency(session.amount_due, currency)}
            </span>
          </div>
        </div>

        {session.notes && (
          <p className="text-sm text-ink-muted mt-1.5 leading-relaxed line-clamp-2">{session.notes}</p>
        )}

        {(onEdit || (session.payment_status !== "paid" && onMarkPaid)) && (
          <div className="flex items-center gap-3 mt-2">
            {session.payment_status !== "paid" && onMarkPaid && (
              <button
                onClick={() => onMarkPaid(session.id)}
                className="text-xs text-brand-teal hover:underline font-medium"
              >
                Mark as paid
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(session)}
                className="text-xs text-ink-muted hover:underline font-medium"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
