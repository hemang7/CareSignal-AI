"use client";

/**
 * Session-scoped patient store.
 * Persists to sessionStorage. No backend.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AnalysisResult, Patient } from "@/types/patient";

const STORAGE_KEY = "caregiver_patients";
const LEGACY_DUMMY_ID = "mary-thompson";

function loadFromStorage(): { patients: Patient[]; activePatientId: string | null } {
  if (typeof window === "undefined") {
    return { patients: [], activePatientId: null };
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as {
        patients: Patient[];
        activePatientId: string | null;
      };
      const patients = (parsed.patients ?? []).filter(
        (p) => p.id !== LEGACY_DUMMY_ID
      );
      if (patients.length > 0) {
        const activeId = parsed.activePatientId;
        const validActiveId =
          activeId && patients.some((p) => p.id === activeId)
            ? activeId
            : patients[0].id;
        return { patients, activePatientId: validActiveId };
      }
    }
  } catch {
    // ignore
  }
  return { patients: [], activePatientId: null };
}

function saveToStorage(patients: Patient[], activePatientId: string | null) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ patients, activePatientId })
  );
}

interface PatientStoreContextValue {
  patients: Patient[];
  activePatientId: string | null;
  activePatient: Patient | null;
  addPatient: (name: string, age: number) => void;
  setActivePatient: (id: string | null) => void;
  addAnalysisToActivePatient: (result: Omit<AnalysisResult, "timestamp">) => void;
}

const PatientStoreContext = createContext<PatientStoreContextValue | null>(null);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const { patients: p, activePatientId: a } = loadFromStorage();
    setPatients(p);
    setActivePatientIdState(a);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(patients, activePatientId);
  }, [patients, activePatientId, hydrated]);

  const addPatient = useCallback((name: string, age: number) => {
    const id = `patient-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const patient: Patient = { id, name, age, analyses: [] };
    setPatients((prev) => [...prev, patient]);
    setActivePatientIdState(id);
  }, []);

  const setActivePatient = useCallback((id: string | null) => {
    setActivePatientIdState(id);
  }, []);

  const addAnalysisToActivePatient = useCallback(
    (result: Omit<AnalysisResult, "timestamp">) => {
      if (!activePatientId) return;
      const analysis: AnalysisResult = {
        ...result,
        timestamp: Date.now(),
      };
      setPatients((prev) =>
        prev.map((p) =>
          p.id === activePatientId
            ? { ...p, analyses: [analysis, ...p.analyses] }
            : p
        )
      );
    },
    [activePatientId]
  );

  const activePatient = patients.find((p) => p.id === activePatientId) ?? null;

  const value: PatientStoreContextValue = {
    patients,
    activePatientId,
    activePatient,
    addPatient,
    setActivePatient,
    addAnalysisToActivePatient,
  };

  return (
    <PatientStoreContext.Provider value={value}>
      {children}
    </PatientStoreContext.Provider>
  );
}

export function usePatientStore() {
  const ctx = useContext(PatientStoreContext);
  if (!ctx) {
    throw new Error("usePatientStore must be used within PatientProvider");
  }
  return ctx;
}
