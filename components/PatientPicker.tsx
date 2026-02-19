"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { usePatientStore } from "@/lib/patient-store";
import { cn } from "@/lib/utils";

const MODAL_Z = 10060;

interface PatientPickerProps {
  /** When provided, overrides the default trigger label (e.g. "Switch patient") */
  triggerLabel?: string;
  /** Use larger, more prominent trigger styling (e.g. for context bar) */
  variant?: "default" | "contextBar";
}

export function PatientPicker({ triggerLabel, variant = "default" }: PatientPickerProps) {
  const { patients, activePatient, setActivePatient, addPatient } =
    usePatientStore();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(typeof document !== "undefined");
  }, []);

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    const handleResize = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
      updateDropdownPosition();
    };
    setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        open &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!addOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddOpen(false);
        setName("");
        setAge("");
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [addOpen]);

  const handleAddPatient = () => {
    const n = name.trim();
    const a = Number.parseInt(age, 10);
    if (n && !Number.isNaN(a) && a > 0 && a < 150) {
      addPatient(n, a);
      setName("");
      setAge("");
      setAddOpen(false);
    }
  };

  return (
    <>
      <div className={cn("relative", variant === "contextBar" ? "w-full sm:w-auto" : "max-w-[140px] sm:max-w-none")}>
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          className={cn(
            "flex items-center gap-2 rounded-lg text-sm font-medium transition-colors",
            "border border-border bg-card hover:bg-muted-bg",
            "text-foreground min-w-0 max-w-full",
            variant === "contextBar"
              ? "px-4 py-2.5 min-h-[44px] w-full sm:w-auto justify-center"
              : "px-2 sm:px-3 py-1.5 sm:py-2 min-h-[44px] sm:min-h-0"
          )}
        >
          {triggerLabel ? (
            <span className="truncate">{triggerLabel}</span>
          ) : (
            <>
              <span className="text-muted shrink-0 hidden sm:inline">Patient:</span>
              <span className="truncate">
                {activePatient ? `${activePatient.name} (${activePatient.age})` : "Select"}
              </span>
            </>
          )}
          <svg
            className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Patient dropdown — portaled, fixed positioning */}
      {mounted &&
        open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className={cn(
              "fixed z-[10050] rounded-lg border border-border bg-card shadow-xl py-1",
              "max-h-[min(70vh,400px)] overflow-y-auto"
            )}
            style={{
              top: dropdownPosition.top,
              left: isMobile ? 16 : dropdownPosition.left,
              width: isMobile ? "calc(100vw - 2rem)" : 224,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {patients.map((p) => (
              <button
                key={p.id}
                role="option"
                aria-selected={activePatient?.id === p.id}
                onClick={() => {
                  setActivePatient(p.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 min-h-[44px] flex items-center text-sm hover:bg-muted-bg",
                  activePatient?.id === p.id &&
                    "bg-primary-muted text-primary font-medium"
                )}
              >
                <span className="truncate">
                  {p.name} ({p.age})
                </span>
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  setAddOpen(true);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 min-h-[44px] flex items-center text-sm text-primary hover:bg-muted-bg font-medium"
              >
                + Add Patient
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Add Patient modal — portaled, highest z */}
      {addOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
            style={{
              zIndex: MODAL_Z,
              isolation: "isolate",
            }}
            onClick={() => {
              setAddOpen(false);
              setName("");
              setAge("");
            }}
          >
            <div
              className="bg-card rounded-xl border border-border p-6 w-full max-w-sm shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-patient-title"
            >
              <h3 id="add-patient-title" className="font-semibold text-lg mb-5">
                Add Patient
              </h3>
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="patient-name"
                    className="block text-sm font-medium text-muted mb-2"
                  >
                    Name
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="patient-age"
                    className="block text-sm font-medium text-muted mb-2"
                  >
                    Age
                  </label>
                  <input
                    id="patient-age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 78"
                    min={1}
                    max={150}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setName("");
                    setAge("");
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted-bg transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPatient}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors min-h-[44px]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
