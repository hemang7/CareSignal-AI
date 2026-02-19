"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageContainer, Card, Button } from "@/components";
import { PatientSafetyBanner } from "@/components";
import { usePatientStore } from "@/lib/patient-store";
import {
  deriveAISummaryShort,
  getHighestRiskSeverity,
  computeAIConfidence,
  getNewSinceLastVisitFindings,
  deriveAISnapshotText,
  deriveTrendChips,
  deriveKeyTakeaway,
  countNewRisksSincePrior,
} from "@/lib/insights-utils";

function formatVisitDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `Today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { activePatient } = usePatientStore();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const analyses = activePatient?.analyses ?? [];
  const latestAnalysis = analyses[0] ?? null;
  const previousAnalysis = analyses[1] ?? null;
  const hasMultipleVisits = analyses.length >= 2;

  const riskFlags = latestAnalysis?.risks?.risk_flags ?? [];
  const structuredData = latestAnalysis?.structuredData;
  const activitiesCompleted = structuredData?.activities_completed ?? [];
  const concerns = structuredData?.concerns ?? [];
  const followups = structuredData?.suggested_followups ?? [];
  const highestRisk = getHighestRiskSeverity(riskFlags);

  const { aiSnapshot, confidence, newFindings, trendChips, newRisksCount, keyTakeaway } =
    useMemo(() => {
      const snapshot = latestAnalysis
        ? deriveAISnapshotText(latestAnalysis, previousAnalysis)
        : "";
      const conf = latestAnalysis ? computeAIConfidence(latestAnalysis) : null;
      const findings =
        latestAnalysis && previousAnalysis
          ? getNewSinceLastVisitFindings(latestAnalysis, previousAnalysis)
          : [];
      const chips =
        latestAnalysis && previousAnalysis
          ? deriveTrendChips(latestAnalysis, previousAnalysis)
          : [];
      const newCount =
        latestAnalysis && previousAnalysis
          ? countNewRisksSincePrior(latestAnalysis, previousAnalysis)
          : 0;
      const takeaway =
        latestAnalysis
          ? deriveKeyTakeaway(latestAnalysis, previousAnalysis)
          : "";
      return {
        aiSnapshot: snapshot,
        confidence: conf,
        newFindings: findings,
        trendChips: chips,
        newRisksCount: newCount,
        keyTakeaway: takeaway,
      };
    }, [latestAnalysis, previousAnalysis]);

  if (!activePatient) {
    return (
      <PageContainer>
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Today&apos;s Visit
            </h1>
            <p className="text-muted mt-1">{today}</p>
          </div>
          <Card className="text-center py-16">
            <p className="text-muted mb-4">
              Select a patient from the header to see their care overview
            </p>
            <Button href="/record">Record Visit</Button>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6 sm:space-y-8">
        {/* Patient header + microcopy */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {activePatient.name}
          </h1>
          <p className="text-muted mt-1">{today}</p>
          <p className="text-sm text-muted mt-2 italic">
            Supporting safer care through structured visit intelligence.
          </p>
        </div>

        {/* Patient Safety Banner */}
        {latestAnalysis && (
          <PatientSafetyBanner riskFlags={riskFlags} />
        )}

        {/* AI Snapshot + Trend Chips */}
        {latestAnalysis && (
          <Card className="border-primary/20 bg-primary-muted/10">
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              AI Snapshot
            </h2>
            <p className="text-foreground leading-relaxed font-medium">
              {aiSnapshot}
            </p>
            {confidence && (
              <p className="mt-3 text-xs text-muted">
                AI Confidence: {confidence.level}
                <br />
                <span className="text-muted">{confidence.reasoning}</span>
              </p>
            )}
            {hasMultipleVisits && trendChips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-muted font-medium">Trends:</span>
                {trendChips.map((chip, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded-md font-medium ${
                      chip.direction === "up"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : chip.direction === "down"
                          ? "bg-success/15 text-success"
                          : "bg-muted-bg text-muted"
                    }`}
                  >
                    {chip.direction === "up" && "⬆ "}
                    {chip.direction === "down" && "⬇ "}
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
            {!hasMultipleVisits && (
              <p className="mt-3 text-xs text-muted italic">
                Trend insights unlock after multiple visits.
              </p>
            )}
          </Card>
        )}

        {/* New Since Last Visit */}
        {hasMultipleVisits && latestAnalysis && (
          <Card>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              New Since Last Visit
            </h2>
            {newFindings.length > 0 ? (
              <ul className="space-y-1.5">
                {newFindings.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-foreground">
                    <span className="text-primary">•</span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted italic">
                No new concerning signals detected since prior visit.
              </p>
            )}
          </Card>
        )}

        {/* Smart Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="flex flex-col gap-2">
            <span className="text-sm text-muted">Visits recorded</span>
            <span className="text-3xl font-bold text-primary">{analyses.length}</span>
            <span className="text-sm text-muted">
              Structured visits for this patient
            </span>
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-sm text-muted">Last Visit</span>
            <span className="text-2xl font-bold text-foreground">
              {latestAnalysis ? formatDateShort(latestAnalysis.timestamp) : "—"}
            </span>
            <span className="text-sm text-muted">
              {latestAnalysis ? "AI analyzed" : "No visits yet"}
            </span>
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-sm text-muted">Active Risks</span>
            <span className="text-3xl font-bold text-foreground">{riskFlags.length}</span>
            <span className="text-sm text-muted">
              {riskFlags.length === 0
                ? "None on latest visit"
                : newRisksCount > 0
                  ? `${newRisksCount} new since last visit`
                  : highestRisk
                    ? `${highestRisk} severity`
                    : "on latest visit"}
            </span>
          </Card>
        </div>

        {/* Latest Clinical Signals (renamed from "From latest visit") */}
        {latestAnalysis ? (
          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Latest Clinical Signals
              </h2>
              {highestRisk && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    highestRisk === "high"
                      ? "bg-red-500/20 text-red-700 dark:text-red-300"
                      : highestRisk === "medium"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-muted-bg text-muted"
                  }`}
                >
                  {highestRisk === "medium" ? "Moderate" : highestRisk} Risk
                </span>
              )}
            </div>
            <div className="rounded-lg bg-muted-bg/50 px-3 py-2 mb-4">
              <p className="text-xs font-medium text-muted mb-1">Key Takeaway</p>
              <p className="text-sm text-foreground font-medium">&ldquo;{keyTakeaway}&rdquo;</p>
            </div>
            <div className="space-y-4">
              {activitiesCompleted.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted font-medium mb-2">
                    Completed
                  </p>
                  <ul className="space-y-1.5">
                    {activitiesCompleted.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground">
                        <span className="text-success">✓</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {concerns.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted font-medium mb-2">
                    Watch items
                  </p>
                  <ul className="space-y-1.5">
                    {concerns.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground">
                        <span className="text-amber-500">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {followups.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted font-medium mb-2">
                    Suggested follow-ups
                  </p>
                  <ul className="space-y-1.5">
                    {followups.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground">
                        <span className="text-primary">→</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activitiesCompleted.length === 0 &&
                concerns.length === 0 &&
                followups.length === 0 && (
                  <p className="text-sm text-muted">
                    No structured data from this visit. View full insights for details.
                  </p>
                )}
            </div>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <p className="text-muted mb-4">
              No visits recorded yet for {activePatient.name}
            </p>
            <Button href="/record">Record first visit</Button>
          </Card>
        )}

        {analyses.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Recent visits
            </h2>
            <ul className="space-y-3">
              {analyses.slice(0, 5).map((a, i) => (
                <li key={i}>
                  <Link
                    href={`/insights?visit=${i}`}
                    className="flex items-center justify-between gap-4 py-2 rounded-lg hover:bg-muted-bg/50 transition-colors group"
                  >
                    <span className="text-foreground group-hover:text-primary transition-colors truncate">
                      {deriveAISummaryShort(a)}
                    </span>
                    <span className="text-sm text-muted shrink-0">
                      {formatVisitDate(a.timestamp)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Button href="/record" size="lg" className="flex-1 sm:flex-initial">
            Record Visit Notes
          </Button>
          <Button href="/insights" variant="outline" size="lg">
            View Insights
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
