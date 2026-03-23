"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/reminders", label: "Reminders", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  function isNavActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[200px] flex-col bg-white border-r border-surface-border z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-surface-border">
          <span className="text-lg font-semibold tracking-tight text-ink">
            tutor
            <span className="text-brand-teal">desk</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isNavActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-teal-light text-brand-teal"
                    : "text-ink-muted hover:text-ink hover:bg-surface-muted"
                )}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-border">
          <p className="text-xs text-ink-faint">Phase 1 — Mock data</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border z-40 flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isNavActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-brand-teal"
                  : "text-ink-faint hover:text-ink-muted"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
