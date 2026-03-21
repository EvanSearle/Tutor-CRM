import { cn } from "@/lib/utils";
import type { StudentStatus } from "@/types";

const STATUS_STYLES: Record<StudentStatus, string> = {
  active: "bg-status-active-bg text-status-active-text",
  trial: "bg-status-trial-bg text-status-trial-text",
  prospect: "bg-status-prospect-bg text-status-prospect-text",
  paused: "bg-status-paused-bg text-status-paused-text",
  churned: "bg-status-churned-bg text-status-churned-text",
};

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Active",
  trial: "Trial",
  prospect: "Prospect",
  paused: "Paused",
  churned: "Churned",
};

interface StatusBadgeProps {
  status: StudentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
