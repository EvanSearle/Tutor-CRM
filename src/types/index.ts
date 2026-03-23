export type StudentStatus = "prospect" | "trial" | "active" | "paused" | "churned";

export type Mood = "good" | "okay" | "tough";

export type PaymentStatus = "unpaid" | "invoiced" | "paid";

export interface Student {
  id: string;
  tutor_id: string;
  name: string;
  grade: string;
  subjects: string[];
  student_email: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  hourly_rate: number;
  currency: string;
  status: StudentStatus;
  pause_reason?: string;
  source: string;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PauseEvent {
  id: string;
  student_id: string;
  tutor_id: string;
  action: "paused" | "unpaused";
  reason: string;
  timestamp: string;
}

export interface Session {
  id: string;
  student_id: string;
  tutor_id: string;
  date: string;
  duration_minutes: number;
  notes: string;
  mood: Mood;
  payment_status: PaymentStatus;
  amount_due: number;
  created_at: string;
}

export interface Reminder {
  id: string;
  student_id: string;
  tutor_id: string;
  note: string;
  due_date: string;
  completed: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  tutor_id: string;
  amount: number;
  currency: string;
  method: string;
  note: string;
  paid_at: string;
  session_ids: string[];
}

export interface DashboardMetrics {
  active_students: number;
  sessions_this_week: number;
  unpaid_balance: number;
  monthly_revenue: number;
}
