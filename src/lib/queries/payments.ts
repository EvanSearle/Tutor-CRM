import { supabase } from "@/lib/supabase";
import type { Payment } from "@/types";

export async function getAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase.from("payments").select("*").order("paid_at", { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("student_id", studentId)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data as Payment[];
}
