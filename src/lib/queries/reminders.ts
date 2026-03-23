import { supabase } from "@/lib/supabase";
import type { Reminder } from "@/types";

export async function getReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase.from("reminders").select("*").order("due_date", { ascending: true });
  if (error) throw error;
  return data as Reminder[];
}

export async function addReminder(reminder: Reminder): Promise<void> {
  const { error } = await supabase.from("reminders").insert(reminder);
  if (error) throw error;
}

export async function toggleReminder(id: string): Promise<void> {
  const { data, error } = await supabase.from("reminders").select("completed").eq("id", id).single();
  if (error) throw error;
  const { error: upErr } = await supabase.from("reminders").update({ completed: !data.completed }).eq("id", id);
  if (upErr) throw upErr;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}
