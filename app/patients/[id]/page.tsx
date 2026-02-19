"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer, Card, Button } from "@/components";
import { usePatientStore } from "@/lib/patient-store";
import type { RiskFlag } from "@/types/patient";
import {
  deriveAISummaryShort,
  getTrendIndicatorForTimeline,
  getTrendLabels,
  getHighestRiskSeverity,
} from "@/lib/insights-utils";

function formatDate(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return {
    date: isToday
      ? "Today"
      : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function getSeverityBadge(severity: string) {
  const s = severity?.toLowerCase() ?? "low";
  if (s === "high") return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (s === "medium" || s === "moderate") return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-muted-bg text-muted";
}

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { patients, setActivePatient } = usePatientStore();

  const patient = patients.find((p) => p.id === id);

  if (!patient) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold">Patient not found</h1>
          <p className="text-muted mt-2">
            Session may have been cleared. Add the patient again to continue.
          </p>
          <Button href="/record" className="mt-4">
            Record Visit
          </Button>
        </div>
      </PageContainer>
    );
  }

  const handleSetActive = () => {
    setActivePatient(patient.id);
    router.push("/record");
  };

  return (
    <PageContainer>
      <div className="space-y-10">
        {/* Patient header */}
        <div className="pb-6 border-b border-border">
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          <p className="text-muted mt-0.5">Age {patient.age}</p>
          <p className="text-sm text-muted mt-2 italic">
            Supporting safer care through structured visit insights.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button size="sm" onClick={handleSetActive}>
              Record visit
            </Button>
            <Button href="/record" variant="outline" size="sm">
              Back to Record
            </Button>
            <Link href="/insights">
              <Button variant="outline" size="sm">
                Latest insights
              </Button>
            </Link>
          </div>
        </div>

        {/* Care timeline */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-4">
            Care timeline
          </h2>
          {patient.analyses.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-muted">No visits recorded yet</p>
              <Button href="/record" className="mt-4">
                Record first visit
              </Button>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {patient.analyses.map((analysis, i) => {
                  const { date, time } = formatDate(analysis.timestamp);
                  const summary = deriveAISummaryShort(analysis);
                  const riskFlags = analysis.risks?.risk_flags ?? [];
                  const prevAnalysis = patient.analyses[i + 1] ?? null;
                  const trendIndicator = getTrendIndicatorForTimeline(analysis, prevAnalysis);
                  const trendLabels = getTrendLabels(analysis, prevAnalysis);
                  const highestSeverity = getHighestRiskSeverity(riskFlags);

                  return (
                    <div key={i} className="relative flex gap-6 pl-10">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                      <Card className="flex-1 min-w-0 space-y-4 shadow-md">
                        <div className="flex flex-wrap items-center gap-2">
                          <div>
                            <p className="text-lg font-semibold text-foreground">
                              {date}
                            </p>
                            <p className="text-sm text-muted">{time}</p>
                          </div>
                          {highestSeverity && (
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${
                                highestSeverity === "high"
                                  ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                  : highestSeverity === "medium"
                                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                    : "bg-muted-bg text-muted"
                              }`}
                            >
                              {highestSeverity === "medium" ? "Moderate" : highestSeverity} Risk
                            </span>
                          )}
                          {trendLabels.map((tl, k) => (
                            <span
                              key={k}
                              className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                tl.type === "new"
                                  ? "bg-primary/15 text-primary"
                                  : tl.type === "worsening"
                                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                    : "bg-success/15 text-success"
                              }`}
                            >
                              {tl.label}
                            </span>
                          ))}
                        </div>

                        <div className="text-sm text-foreground">
                          <p className="line-clamp-4">{summary}</p>
                          {trendIndicator && (
                            <p className="mt-1 text-xs text-muted italic">
                              {trendIndicator}
                            </p>
                          )}
                        </div>

                        {riskFlags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {riskFlags.slice(0, 3).map((flag: RiskFlag, j: number) => (
                              <span
                                key={j}
                                className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getSeverityBadge(flag.severity)}`}
                              >
                                {flag.risk}
                              </span>
                            ))}
                            {riskFlags.length > 3 && (
                              <span className="text-xs text-muted">
                                +{riskFlags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActivePatient(patient.id);
                            router.push(`/insights?visit=${i}`);
                          }}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          View full analysis →
                        </button>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
