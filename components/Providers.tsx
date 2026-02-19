"use client";

import { PatientProvider } from "@/lib/patient-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PatientProvider>{children}</PatientProvider>;
}
