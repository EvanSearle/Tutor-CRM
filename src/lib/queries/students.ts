import { supabase } from "@/lib/supabase";
import type { Student, StudentStatus, PauseEvent } from "@/types";

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Student[];
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
  if (error) { if (error.code === "PGRST116") return null; throw error; }
  return data as Student;
}

export async function addStudent(student: Student): Promise<void> {
  const { error } = await supabase.from("students").insert(student);
  if (error) throw error;
}

export async function updateStudent(updated: Student): Promise<void> {
  const { error } = await supabase.from("students").update(updated).eq("id", updated.id);
  if (error) throw error;
}

export async function updateStudentStatus(id: string, status: StudentStatus): Promise<void> {
  const { error } = await supabase.from("students").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function pauseStudent(studentId: string, reason: string): Promise<void> {
  const { error } = await supabase.from("students").update({
    status: "paused",
    pause_reason: reason,
    updated_at: new Date().toISOString(),
  }).eq("id", studentId);
  if (error) throw error;

  const event: PauseEvent = {
    id: crypto.randomUUID(),
    student_id: studentId,
    tutor_id: "t1",
    action: "paused",
    reason,
    timestamp: new Date().toISOString(),
  };
  const { error: evErr } = await supabase.from("pause_events").insert(event);
  if (evErr) throw evErr;
}

export async function unpauseStudent(studentId: string): Promise<void> {
  const { error } = await supabase.from("students").update({
    status: "active",
    pause_reason: "",
    updated_at: new Date().toISOString(),
  }).eq("id", studentId);
  if (error) throw error;

  const event: PauseEvent = {
    id: crypto.randomUUID(),
    student_id: studentId,
    tutor_id: "t1",
    action: "unpaused",
    reason: "",
    timestamp: new Date().toISOString(),
  };
  const { error: evErr } = await supabase.from("pause_events").insert(event);
  if (evErr) throw evErr;
}

export async function getPauseEventsByStudentId(studentId: string): Promise<PauseEvent[]> {
  const { data, error } = await supabase
    .from("pause_events")
    .select("*")
    .eq("student_id", studentId)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return data as PauseEvent[];
}
