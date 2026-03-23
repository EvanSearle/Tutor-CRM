import type { Mood } from "@/types";

export const inputCls =
  "w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors";

export const MOOD_DOT: Record<Mood, string> = {
  good: "bg-green-500",
  okay: "bg-amber-400",
  tough: "bg-red-400",
};
