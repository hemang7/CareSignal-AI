"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePatientStore } from "@/lib/patient-store";
import { cn } from "@/lib/utils";

export function PatientPicker() {
  const { patients, activePatient, setActivePatient, addPatient } =
    usePatientStore();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddPatient = () => {
    const n = name.trim();
    const a = parseInt(age, 10);
    if (n && !isNaN(a) && a > 0 && a < 150) {
      addPatient(n, a);
      setName("");
      setAge("");
      setAddOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium",
          "border border-border bg-card hover:bg-muted-bg transition-colors",
          "text-foreground min-w-0"
        )}
      >
        <span className="text-muted shrink-0 hidden sm:inline">Patient:</span>
        <span className="truncate">{activePatient ? `${activePatient.name} (${activePatient.age})` : "Select"}</span>
        <svg
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg z-[100] py-1">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActivePatient(p.id);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-2 text-sm hover:bg-muted-bg",
                activePatient?.id === p.id && "bg-primary-muted text-primary font-medium"
              )}
            >
              {p.name} ({p.age})
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => {
                setAddOpen(true);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-muted-bg font-medium"
            >
              + Add Patient
            </button>
          </div>
        </div>
      )}

      {addOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
            style={{ isolation: "isolate" }}
            onClick={() => {
              setAddOpen(false);
              setName("");
              setAge("");
            }}
          >
            <div
              className="bg-card rounded-xl border border-border p-6 w-full max-w-sm shadow-2xl"
              style={{ maxHeight: "calc(100vh - 2rem)" }}
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
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPatient}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
