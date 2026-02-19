"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PatientPicker } from "./PatientPicker";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/record", label: "Record Visit" },
  { href: "/insights", label: "Insights" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="flex flex-col sm:flex-row h-auto sm:h-14 lg:h-16 sm:items-center justify-between gap-3 py-3 sm:py-0">
          <Link
            href="/"
            className="text-base sm:text-lg lg:text-xl font-semibold text-foreground hover:text-primary transition-colors shrink-0"
          >
            <span className="hidden sm:inline">AI </span>Caregiver Co-Pilot
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 sm:flex-initial">
            <div className="shrink-0 overflow-visible">
              <PatientPicker />
            </div>
            <nav className="flex items-center gap-1 sm:gap-4 min-w-0 overflow-x-auto scrollbar-hide">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium whitespace-nowrap px-2 sm:px-3 py-2 rounded-lg transition-colors shrink-0",
                    pathname === link.href
                      ? "text-primary bg-primary-muted"
                      : "text-muted hover:text-foreground hover:bg-muted-bg"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
