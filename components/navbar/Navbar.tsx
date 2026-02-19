"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinks } from "./NavLinks";
import { MobileMenuPortal } from "./MobileMenuPortal";

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="flex flex-wrap items-center justify-between h-12 sm:h-14 lg:h-16 gap-2 sm:gap-3">
          {/* Logo */}
          <Link
            href="/"
            className="text-sm sm:text-lg lg:text-xl font-semibold text-foreground hover:text-primary transition-colors shrink-0 min-w-0 truncate"
          >
            CareSignal <span className="text-primary">AI</span>
          </Link>

          {/* Desktop (>=1024px): Full nav inline */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2 min-w-0 shrink">
            <nav className="flex items-center gap-1 xl:gap-2 min-w-0" aria-label="Main navigation">
              <NavLinks variant="inline" />
            </nav>
          </div>

          {/* Tablet (768-1023px): Tighter nav */}
          <div className="hidden md:flex lg:hidden items-center gap-1 min-w-0 shrink">
            <nav className="flex items-center gap-1 min-w-0" aria-label="Main navigation">
              <NavLinks variant="inline" />
            </nav>
          </div>

          {/* Mobile (<768px): Hamburger only */}
          <div className="flex md:hidden items-center min-w-0 flex-1 justify-end">
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="shrink-0 p-2 rounded-lg text-foreground hover:bg-muted-bg transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <MobileMenuPortal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={hamburgerRef}
      />
    </header>
  );
}
