import { supabase } from "@/lib/supabase";
import type { Session } from "@/types";

export async function getAllSessions(): Promise<Session[]> {
  const { data, error } = await supabase.from("sessions").select("*").order("date", { ascending: false });
  if (error) throw error;
  return data as Session[];
}

export async function getSessionsByStudentId(studentId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as Session[];
}

export async function addSession(session: Session): Promise<void> {
  const { error } = await supabase.from("sessions").insert(session);
  if (error) throw error;
}

export async function markSessionPaid(sessionId: string): Promise<void> {
  const { error } = await supabase.from("sessions").update({ payment_status: "paid" }).eq("id", sessionId);
  if (error) throw error;
}

export async function editSession(updated: Session): Promise<void> {
  const { error } = await supabase.from("sessions").update(updated).eq("id", updated.id);
  if (error) throw error;
}
