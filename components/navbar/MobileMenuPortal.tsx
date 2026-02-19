"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePatientStore } from "@/lib/patient-store";
import { NavLinks } from "./NavLinks";
import { cn } from "@/lib/utils";

interface MobileMenuPortalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const GITHUB_URL = "https://github.com/hemang7/AI-Caregiver";

export function MobileMenuPortal({
  isOpen,
  onClose,
  triggerRef,
}: MobileMenuPortalProps) {
  const pathname = usePathname();
  const { activePatient } = usePatientStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(typeof document !== "undefined");
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      triggerRef.current?.focus();
    }, 300);
  };

  // Close only when pathname changes
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsClosing(false);
        onClose();
        triggerRef.current?.focus();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose, triggerRef]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen && !isClosing) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prev;
        document.body.style.touchAction = "";
      };
    }
  }, [isOpen, isClosing]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || isClosing || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusables = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    drawer.addEventListener("keydown", handleTab);
    return () => drawer.removeEventListener("keydown", handleTab);
  }, [isOpen, isClosing]);

  if (!mounted || (!isOpen && !isClosing)) return null;

  const overlay = (
    <div
      className="fixed inset-0 md:hidden"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        isolation: "isolate",
      }}
    >
      {/* Backdrop: z-40, full screen, fixed */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
        }}
        onClick={handleClose}
        role="presentation"
        aria-hidden
      />

      {/* Drawer: z-50, fixed right, 75vw */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "fixed top-0 right-0 h-full flex flex-col",
          "bg-card/95 backdrop-blur-md border-l border-border",
          "shadow-2xl shadow-black/20",
          "transition-transform duration-300 ease-out",
          isClosing ? "translate-x-full" : "translate-x-0"
        )}
        style={{
          width: "75vw",
          maxWidth: "24rem",
          height: "100vh",
          zIndex: 50,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Branding */}
        <div className="px-5 py-6 border-b border-border shrink-0">
          <p className="font-semibold text-foreground">CareSignal AI</p>
          <p className="text-sm text-muted mt-0.5">
            Smarter care insights in seconds.
          </p>
        </div>

        {/* Nav links */}
        <nav
          className="flex-1 px-3 py-4 overflow-y-auto min-h-0"
          aria-label="Main navigation"
        >
          <div className="space-y-0.5">
            <NavLinks variant="drawer" onLinkClick={handleClose} />
          </div>

          {/* Care History / Patients */}
          <div className="mt-6 pt-4 border-t border-border">
            {activePatient ? (
              <Link
                href={`/patients/${activePatient.id}`}
                onClick={handleClose}
                className={cn(
                  "block w-full text-left text-base px-4 py-3 rounded-lg transition-colors",
                  pathname === `/patients/${activePatient.id}`
                    ? "text-primary bg-primary-muted/30"
                    : "text-foreground hover:bg-muted-bg",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                )}
              >
                Care History
              </Link>
            ) : (
              <Link
                href="/dashboard"
                onClick={handleClose}
                className={cn(
                  "block w-full text-left text-base px-4 py-3 rounded-lg transition-colors",
                  "text-muted hover:text-foreground hover:bg-muted-bg",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                )}
              >
                Care History
              </Link>
            )}
          </div>
        </nav>

        {/* Footer with GitHub */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
