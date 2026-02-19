"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageContainer, Card, Button } from "@/components";
import { usePatientStore } from "@/lib/patient-store";
import type { AnalysisResult, RiskFlag } from "@/types/patient";
import {
  computeTrendAnalysis,
  generateEscalation,
  getContributingSignals,
  computeAIConfidence,
  buildEMRExportText,
  sortRisksBySeverity,
  RISK_KEYWORDS,
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripFillerPhrases(text: string): string {
  return text
    .replace(/\bVisit with [^.]* showed (?:he|she|they|patient) was\s+/gi, "")
    .replace(/\b(?:The )?patient (?:was )?(?:observed to be |noted to be )/gi, "")
    .replace(/\b(?:Overall |In summary,? )/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function deriveAISummary(analysis: AnalysisResult): string {
  const { structuredData, risks } = analysis;
  const rawSummary = structuredData?.visit_summary ?? "";
  const summary = stripFillerPhrases(rawSummary);
  const concerns = structuredData?.concerns ?? [];
  const observations = structuredData?.key_observations ?? [];
  const riskFlags = risks?.risk_flags ?? [];
  const highRisks = riskFlags.filter((f) => f.severity?.toLowerCase() === "high");
  const hasRisks = riskFlags.length > 0;
  const hasConcerns = concerns.length > 0;

  if (highRisks.length > 0) {
    const topics = highRisks.map((r) => r.risk.toLowerCase());
    const base =
      topics.length === 1
        ? `${topics[0]} may warrant attention.`
        : `Multiple risks noted: ${topics.join(", ")}.`;
    let detail = "";
    if (hasConcerns) {
      const cleaned = concerns.slice(0, 2).map((c) => c.replace(/\.+$/, "").trim().toLowerCase());
      detail = `Monitor ${cleaned.join(" and ")}.`;
    } else if (highRisks[0]?.reason) {
      detail = highRisks[0].reason.split(".")[0].trim() + ".";
    } else if (observations[0]) {
      detail = observations[0].replace(/\.+$/, "") + ".";
    }
    return detail ? `${base} ${detail}` : base;
  }
  if (hasRisks || hasConcerns) {
    const concernNote = hasConcerns && concerns.length > 0
      ? `Monitor ${concerns.slice(0, 2).join(", ").toLowerCase()}. `
      : "";
    const out = summary ? `${concernNote}${summary}` : (concernNote || "Stable visit; minor follow-ups suggested.");
    return out;
  }
  return summary || "Visit suggests stable status with no significant concerns.";
}

function getSeverityStyles(severity: string) {
  const s = severity?.toLowerCase() ?? "low";
  if (s === "high") return { bg: "bg-red-500/25 text-red-700 dark:text-red-300 border border-red-500/40", icon: "⚠" };
  if (s === "medium" || s === "moderate") return { bg: "bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40", icon: "⚡" };
  return { bg: "bg-muted-bg text-muted border border-border", icon: "ℹ" };
}

function TranscriptWithHighlights({ text }: { text: string }) {
  const regex = new RegExp(`(${RISK_KEYWORDS.join("|")})`, "gi");
  const parts = text.split(regex);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        RISK_KEYWORDS.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
          <span
            key={i}
            className="text-red-600 dark:text-red-400 font-medium"
            title="May inform risk assessment"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}

function capitalizeSeverity(s: string): string {
  const x = s?.toLowerCase() ?? "low";
  if (x === "medium" || x === "moderate") return "Moderate";
  if (x === "high") return "High";
  return "Low";
}

function buildExportText(
  patientName: string,
  patientAge: number,
  dateStr: string,
  aiSummary: string,
  riskFlags: RiskFlag[],
  suggestedActions: string[]
): string {
  const riskLines = riskFlags.map(
    (f) => `- ${f.risk} (${capitalizeSeverity(f.severity)}): ${softenExportReason(f.reason)}`
  );
  const actionLines = suggestedActions.map((a) => `- ${softenExportAction(a)}`);

  const lines = [
    `Patient: ${patientName}, Age ${patientAge}`,
    `Date: ${dateStr}`,
    "",
    "Summary",
    aiSummary,
    "",
    "Clinical Risk Signals",
    ...riskLines,
    "",
    "Suggested Actions",
    ...actionLines,
  ];
  return lines.join("\n");
}

function softenExportReason(r: string): string {
  return r
    .replace(/\b(indicates|indicate)\b/gi, "may suggest")
    .replace(/\b(confirms|confirm)\b/gi, "consistent with")
    .replace(/\b(detected|detect)\b/gi, "observed")
    .replace(/\b(clearly|definitely|certainly)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function softenExportAction(a: string): string {
  return a.trim();
}

function deriveTrendSummary(
  newFindings: string[],
  worsening: string[],
  improvements: string[]
): string {
  const parts: string[] = [];
  if (newFindings.length > 0) {
    const items = newFindings.slice(0, 3).map((s) =>
      s.replace(/ newly identified$/i, "").replace(/\.+$/, "").trim().toLowerCase()
    );
    parts.push(`New ${items.join(", ")} detected since the previous visit.`);
  }
  if (worsening.length > 0) {
    const items = worsening.slice(0, 2).map((s) =>
      s.replace(/ severity increased$/i, "").replace(/ newly identified$/i, "").replace(/\.+$/, "").trim().toLowerCase()
    );
    parts.push(`${items.join(" and ")} show worsening.`);
  }
  if (improvements.length > 0) {
    const items = improvements.slice(0, 3).map((s) =>
      s.replace(/\.+$/, "").trim().toLowerCase()
    );
    parts.push(`${items.join(" and ")} show improvement.`);
  }
  if (parts.length === 0) return "No significant changes compared to previous visit.";
  return parts.join(" ");
}

function deriveVerdictHeadline(riskFlags: RiskFlag[]): { headline: string; icon: string; styles: ReturnType<typeof getSeverityStyles> } {
  const high = riskFlags.find((r) => r.severity?.toLowerCase() === "high");
  const medium = riskFlags.find((r) => r.severity?.toLowerCase() === "medium" || r.severity?.toLowerCase() === "moderate");
  if (high) {
    return { headline: `Elevated ${high.risk}`, icon: "⚠", styles: getSeverityStyles("high") };
  }
  if (medium) {
    return { headline: `${medium.risk} noted`, icon: "⚡", styles: getSeverityStyles("medium") };
  }
  if (riskFlags.length > 0) {
    return { headline: "Minor signals observed", icon: "ℹ", styles: getSeverityStyles("low") };
  }
  return { headline: "Stable visit", icon: "✓", styles: { bg: "bg-success/20 text-success border border-success/40", icon: "✓" } };
}

function deriveKeyDrivers(
  riskFlags: RiskFlag[],
  concerns: string[],
  observations: string[]
): string[] {
  const drivers: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const key = s.toLowerCase().trim().slice(0, 50);
    if (!seen.has(key) && s.trim()) {
      seen.add(key);
      drivers.push(s.trim().replace(/\.+$/, ""));
    }
  };
  for (const r of riskFlags.slice(0, 2)) {
    const first = r.reason.split(/[.!?]/)[0]?.trim();
    if (first) add(first);
  }
  for (const c of concerns.slice(0, 2)) add(c);
  for (const o of observations.slice(0, 2)) add(o);
  return drivers.slice(0, 4);
}

export default function InsightsPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="animate-pulse py-16 text-center text-muted">Loading insights…</div>
      </PageContainer>
    }>
      <InsightsContent />
    </Suspense>
  );
}

function InsightsContent() {
  const { activePatient } = usePatientStore();
  const searchParams = useSearchParams();
  const visitParam = searchParams.get("visit");
  const rawIndex = Number.parseInt(visitParam ?? "0", 10);
  const maxIndex = Math.max(0, (activePatient?.analyses?.length ?? 1) - 1);
  const visitIndex = Math.min(Math.max(0, Number.isNaN(rawIndex) ? 0 : rawIndex), maxIndex);
  const analyses = activePatient?.analyses ?? [];
  const selectedAnalysis = analyses[visitIndex] ?? analyses[0] ?? null;
  const latestAnalysis = selectedAnalysis;
  const previousAnalysis = analyses[visitIndex + 1] ?? null;
  const [copied, setCopied] = useState(false);
  const [expandedRisks, setExpandedRisks] = useState<Set<number>>(new Set());

  const toggleRisk = (i: number) => {
    setExpandedRisks((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (!activePatient) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold text-foreground">No patient selected</h1>
          <p className="text-sm text-muted mt-2">
            Select a patient from the dropdown to view insights
          </p>
          <Button href="/record" className="mt-4 min-h-[44px]">
            Record Visit
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!latestAnalysis) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold text-foreground">No analysis yet</h1>
          <p className="text-sm text-muted mt-2">
            Record a visit for {activePatient.name} to generate insights
          </p>
          <Button href="/record" className="mt-4 min-h-[44px]">
            Record Visit
          </Button>
        </div>
      </PageContainer>
    );
  }

  const { cleanedTranscript, structuredData, risks } = latestAnalysis;
  const aiSummary = deriveAISummary(latestAnalysis);
  const riskFlags = sortRisksBySeverity(risks?.risk_flags ?? []);
  const trendAnalysis = computeTrendAnalysis(latestAnalysis, previousAnalysis);
  const suggestedActions = generateEscalation(riskFlags);
  const confidence = computeAIConfidence(latestAnalysis);
  const hasMultipleVisits = (activePatient.analyses?.length ?? 0) >= 2;

  const verdict = deriveVerdictHeadline(riskFlags);
  const keyDrivers = deriveKeyDrivers(
    riskFlags,
    structuredData?.concerns ?? [],
    structuredData?.key_observations ?? []
  );

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportSummary = () => {
    copyToClipboard(
      buildExportText(
        activePatient.name,
        activePatient.age,
        formatVisitDate(latestAnalysis.timestamp),
        aiSummary,
        riskFlags,
        suggestedActions
      )
    );
  };

  const handleCopyForEMR = () => {
    copyToClipboard(
      buildEMRExportText(
        activePatient.name,
        activePatient.age,
        formatVisitDate(latestAnalysis.timestamp),
        structuredData?.visit_summary ?? aiSummary,
        riskFlags,
        suggestedActions
      )
    );
  };

  return (
    <PageContainer className="max-w-5xl">
      <div className="space-y-8">
        {/* Patient context header */}
        <div className="pb-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground break-words">
            {activePatient.name}
          </h1>
          <p className="text-sm text-muted mt-1">Age {activePatient.age}</p>
          <div className="flex flex-col gap-3 mt-4">
            <span className="text-sm text-muted">
              Visit analyzed: {formatVisitDate(latestAnalysis.timestamp)}
            </span>
            {analyses.length > 1 && (
              <div className="flex flex-wrap gap-2 items-center min-w-0">
                <span className="text-sm text-muted shrink-0">View:</span>
                <div className="flex gap-1.5 p-0.5 rounded-lg bg-muted-bg/50 border border-border">
                  {analyses.map((a, i) => (
                    <Link
                      key={i}
                      href={`/insights?visit=${i}`}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 min-h-[40px] flex items-center ${
                        i === visitIndex
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted hover:text-foreground hover:bg-muted-bg/80"
                      }`}
                    >
                      {i === 0 ? "Latest" : i === 1 ? "Prior" : `Visit ${i + 1}`}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link
            href={`/patients/${activePatient.id}`}
            className="inline-block mt-3 text-sm text-foreground hover:text-primary hover:underline font-medium"
          >
            View care history →
          </Link>
        </div>

        {/* AI Verdict — Hero Card */}
        <section>
          <div
            className="rounded-xl border p-6 sm:p-8 shadow-xl transition-all duration-200 hover:shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(30,41,59,0.5) 100%)",
              borderColor: "rgba(99,102,241,0.25)",
              boxShadow: "0 0 0 1px rgba(99,102,241,0.1), 0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl sm:text-4xl shrink-0" aria-hidden>
                {verdict.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {verdict.headline}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Confidence: <span className="font-medium text-foreground">{confidence.level}</span>
                  {" · "}
                  <span className="text-muted">{confidence.reasoning}</span>
                </p>
                {keyDrivers.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    <span className="text-sm font-medium text-muted uppercase tracking-wider">
                      Key drivers
                    </span>
                    {keyDrivers.map((d, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground">
                        <span className="text-muted shrink-0">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Recommended Next Steps — Sticky on desktop */}
        {suggestedActions.length > 0 && (
          <section className="lg:sticky lg:top-20 lg:z-10">
            <h2 className="text-lg font-medium text-foreground mb-3">
              Recommended Next Steps
            </h2>
            <Card className="border-l-4 border-l-primary rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg">
              <ul className="space-y-3">
                {suggestedActions.map((action, i) => (
                  <li key={i} className="flex gap-3 items-center">
                    <span className="text-primary shrink-0 inline-flex items-center text-sm" aria-hidden>→</span>
                    <span className="text-sm text-foreground leading-relaxed">{action}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {/* Trend Intelligence — AI moment + chips */}
        {hasMultipleVisits && (
          <section className="pt-6 border-t border-border">
            <h2 className="text-lg font-medium text-foreground mb-6">
              Trend Intelligence
            </h2>

            {/* AI Trend Summary */}
            <div
              className="rounded-xl border p-5 sm:p-6 mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(30,41,59,0.3) 100%)",
                borderColor: "rgba(99,102,241,0.2)",
                boxShadow: "0 0 0 1px rgba(99,102,241,0.08)",
              }}
            >
              <div className="flex gap-3 items-start">
                <span className="text-2xl shrink-0" aria-hidden>🧠</span>
                <div>
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-1">
                    AI Trend Summary
                  </h3>
                  <p className="text-base sm:text-lg text-foreground leading-relaxed">
                    {deriveTrendSummary(
                      trendAnalysis.new_findings,
                      trendAnalysis.worsening_signals,
                      trendAnalysis.improvements
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Change counters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
              {trendAnalysis.new_findings.length > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 border border-primary/30">
                  <span aria-hidden>⚠️</span>
                  <span className="text-sm font-medium text-foreground">
                    {trendAnalysis.new_findings.length} New {trendAnalysis.new_findings.length === 1 ? "Concern" : "Concerns"}
                  </span>
                </div>
              )}
              {trendAnalysis.worsening_signals.length > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30">
                  <span aria-hidden>📉</span>
                  <span className="text-sm font-medium text-foreground">
                    {trendAnalysis.worsening_signals.length} Worsening {trendAnalysis.worsening_signals.length === 1 ? "Signal" : "Signals"}
                  </span>
                </div>
              )}
              {trendAnalysis.improvements.length > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success/15 border border-success/30">
                  <span aria-hidden>✅</span>
                  <span className="text-sm font-medium text-foreground">
                    {trendAnalysis.improvements.length} Improvement{trendAnalysis.improvements.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>

            {/* Chip groups */}
            <div className="space-y-6">
              {trendAnalysis.new_findings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm" aria-hidden>🔍</span>
                    <span className="text-sm font-semibold text-muted uppercase tracking-wider">
                      New Findings
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendAnalysis.new_findings.map((f, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary/15 text-primary border border-primary/30 transition-transform duration-150 hover:scale-105"
                      >
                        NEW: {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {trendAnalysis.worsening_signals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm" aria-hidden>⚠️</span>
                    <span className="text-sm font-semibold text-muted uppercase tracking-wider">
                      Worsening Signals
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendAnalysis.worsening_signals.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/25 text-red-700 dark:text-red-300 border-2 border-red-500/40 transition-transform duration-150 hover:scale-105"
                        style={{ boxShadow: "0 0 12px rgba(239,68,68,0.15)" }}
                      >
                        ⚠ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {trendAnalysis.improvements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm" aria-hidden>📈</span>
                    <span className="text-sm font-semibold text-muted uppercase tracking-wider">
                      Improvements
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendAnalysis.improvements.map((im, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-success/20 text-success border border-success/30 transition-transform duration-150 hover:scale-105"
                      >
                        ✓ {im}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {trendAnalysis.new_findings.length === 0 &&
                trendAnalysis.worsening_signals.length === 0 &&
                trendAnalysis.improvements.length === 0 && (
                  <p className="text-sm text-muted">
                    No significant changes compared to previous visit.
                  </p>
                )}
            </div>

            {/* Section footer */}
            <p className="mt-6 text-sm text-muted/70">
              Insights generated from longitudinal caregiver observations.
            </p>
          </section>
        )}

        {!hasMultipleVisits && (
          <section>
            <h2 className="text-lg font-medium text-foreground mb-3">
              Trend Intelligence
            </h2>
            <p className="text-sm text-muted">
              Additional visit data enables trend comparisons. Continue logging care to see changes over time.
            </p>
          </section>
        )}

        {/* Clinical Risk Breakdown — Accordion */}
        <section>
          <h2 className="text-lg font-medium text-foreground mb-4">
            Clinical Risk Breakdown
          </h2>
          <p className="text-sm text-muted mb-4">Prioritized by potential care impact.</p>
          {riskFlags.length ? (
            <div className="space-y-2">
              {riskFlags.map((flag, i) => {
                const styles = getSeverityStyles(flag.severity);
                const signals = getContributingSignals(
                  flag,
                  structuredData?.concerns ?? [],
                  structuredData?.key_observations ?? []
                );
                const isExpanded = expandedRisks.has(i);
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => toggleRisk(i)}
                      className="w-full text-left flex items-start gap-3 p-4 min-h-[44px]"
                    >
                      <span className="text-xl shrink-0 mt-0.5" aria-hidden>
                        {styles.icon}
                      </span>
                      <span className="font-medium text-foreground flex-1 min-w-0 break-words leading-snug">
                        {flag.risk}
                      </span>
                      <span
                        className={`text-sm font-medium px-2.5 py-1 rounded-md shrink-0 ${styles.bg}`}
                      >
                        {flag.severity?.toLowerCase() === "medium" ||
                        flag.severity?.toLowerCase() === "moderate"
                          ? "Moderate"
                          : flag.severity?.toLowerCase() === "high"
                            ? "High"
                            : "Low"}
                      </span>
                      <svg
                        className={`w-5 h-5 text-muted shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-border">
                        <p className="text-sm text-muted leading-relaxed mt-3">
                          {flag.reason}
                        </p>
                        {signals.length > 0 && (
                          <p className="mt-2 text-sm text-muted/90 italic">
                            Contributing factors:{" "}
                            {signals
                              .slice(0, 4)
                              .map((s) => s.replace(/\.+$/, "").toLowerCase())
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="bg-muted-bg/40 text-center py-8 rounded-xl">
              <p className="text-sm text-muted">
                No clinical risk signals for this visit
              </p>
            </Card>
          )}
        </section>

        {/* Evidence from Visit */}
        <section className="pt-4 border-t border-border">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Evidence from Visit
          </h2>
          <div className="space-y-4">
            {structuredData?.visit_summary ? (
              <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                  Visit Summary
                </h3>
                <p className="text-sm text-foreground leading-relaxed">
                  {structuredData.visit_summary}
                </p>
              </Card>
            ) : null}

            {structuredData?.key_observations?.length ? (
              <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                  Observations
                </h3>
                <ul className="space-y-2">
                  {structuredData.key_observations.map((obs, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="text-muted shrink-0">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {structuredData?.activities_completed?.length ? (
              <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                  Activities completed
                </h3>
                <ul className="space-y-2">
                  {structuredData.activities_completed.map((act, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-success">✓</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {structuredData?.concerns?.length ? (
              <Card className="rounded-xl border-amber-500/30 bg-amber-500/5 transition-all duration-200 hover:shadow-md">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                  Watch items
                </h3>
                <ul className="space-y-2">
                  {structuredData.concerns.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="text-amber-600 dark:text-amber-400 shrink-0">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {structuredData?.suggested_followups?.length ? (
              <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
                <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
                  Recommended follow-ups
                </h3>
                <ul className="space-y-2">
                  {structuredData.suggested_followups.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-primary shrink-0">→</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {/* Collapsible transcript */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground list-none flex items-center justify-between min-h-[44px] py-2 rounded-xl hover:bg-muted-bg/50 px-3 transition-colors">
                <span>Visit transcript</span>
                <span className="text-sm">View / Copy</span>
              </summary>
              <Card className="mt-3 rounded-xl">
                <div className="flex justify-end gap-2 mb-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(cleanedTranscript)}
                    className="min-h-[44px]"
                  >
                    Copy
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap break-words">
                    <TranscriptWithHighlights text={cleanedTranscript} />
                  </p>
                </div>
              </Card>
            </details>
          </div>
        </section>

        {/* Share or Export — Footer */}
        <section className="pt-8 border-t border-border">
          <h2 className="text-lg font-medium text-foreground mb-2">
            Share or Export
          </h2>
          <p className="text-sm text-muted mb-4">
            Formatted for clinical documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCopyForEMR}
              size="md"
              className="w-full sm:w-auto min-h-[44px]"
            >
              Copy for EMR
            </Button>
            <Button
              size="md"
              variant="outline"
              onClick={handleExportSummary}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Export Summary
            </Button>
            {copied && (
              <span className="text-sm text-success self-center">Copied to clipboard</span>
            )}
          </div>
        </section>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button href="/record" className="w-full sm:w-auto min-h-[44px]">
            Record another visit
          </Button>
          <Button
            href={`/patients/${activePatient.id}`}
            variant="outline"
            className="w-full sm:w-auto min-h-[44px]"
          >
            View care history
          </Button>
        </div>

        {/* Transparency line */}
        <div className="pt-8 mt-8 border-t border-border">
          <p
            className="text-sm text-muted"
            title="Designed to assist, not replace, clinical judgment."
          >
            Insights generated from caregiver notes and structured clinical signals.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
