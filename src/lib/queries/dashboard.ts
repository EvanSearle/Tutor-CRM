import { supabase } from "@/lib/supabase";
import type { DashboardMetrics } from "@/types";

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [studentsRes, sessionsWeekRes, unpaidRes, revenueRes] = await Promise.all([
    supabase.from("students").select("id", { count: "exact" }).eq("status", "active"),
    supabase.from("sessions").select("id", { count: "exact" }).gte("date", weekAgo.toISOString().slice(0, 10)).lte("date", today.toISOString().slice(0, 10)),
    supabase.from("sessions").select("amount_due").in("payment_status", ["unpaid", "invoiced"]),
    supabase.from("payments").select("amount").gte("paid_at", monthAgo.toISOString()),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (sessionsWeekRes.error) throw sessionsWeekRes.error;
  if (unpaidRes.error) throw unpaidRes.error;
  if (revenueRes.error) throw revenueRes.error;

  const unpaid_balance = (unpaidRes.data ?? []).reduce((sum, s) => sum + (s.amount_due ?? 0), 0);
  const monthly_revenue = (revenueRes.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    active_students: studentsRes.count ?? 0,
    sessions_this_week: sessionsWeekRes.count ?? 0,
    unpaid_balance,
    monthly_revenue,
  };
}
