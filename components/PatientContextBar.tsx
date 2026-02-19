"use client";

import { usePathname } from "next/navigation";
import { PatientPicker } from "./PatientPicker";
import { usePatientStore } from "@/lib/patient-store";

const PATIENT_ROUTES = ["/dashboard", "/record", "/insights", "/patients"];

function formatLastVisit(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientContextBar() {
  const pathname = usePathname();
  const { activePatient } = usePatientStore();

  const showContextBar = PATIENT_ROUTES.some((route) =>
    pathname === route || pathname.startsWith("/patients/")
  );

  if (!showContextBar) return null;

  return (
    <div className="border-b border-border bg-muted-bg/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">
              Viewing patient:
            </span>
            {activePatient ? (
              <>
                <span className="font-medium text-foreground truncate">
                  {activePatient.name} ({activePatient.age})
                </span>
                {activePatient.analyses?.[0] && (
                  <span className="text-xs text-muted">
                    Last visit: {formatLastVisit(activePatient.analyses[0].timestamp)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted text-sm">No patient selected</span>
            )}
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <PatientPicker triggerLabel="Switch patient" variant="contextBar" />
          </div>
        </div>
      </div>
    </div>
  );
}
