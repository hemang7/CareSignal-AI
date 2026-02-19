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
  getInsightBannerMessage,
  getNewSinceLastVisitFindings,
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

function RiskFlagCard({
  flag,
  concerns,
  observations,
}: {
  flag: RiskFlag;
  concerns: string[];
  observations: string[];
}) {
  const styles = getSeverityStyles(flag.severity);
  const signals = getContributingSignals(flag, concerns, observations);
  const factorsText = signals.length > 0
    ? signals.slice(0, 4).map((s) => s.replace(/\.+$/, "").toLowerCase()).join(", ")
    : null;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 mb-1.5">
        <span className="text-lg shrink-0" aria-hidden>{styles.icon}</span>
        <span className="font-bold text-foreground break-words">{flag.risk}</span>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-md border shrink-0 ${styles.bg}`}
        >
          {flag.severity?.toLowerCase() === "medium" || flag.severity?.toLowerCase() === "moderate"
            ? "Moderate"
            : flag.severity?.toLowerCase() === "high"
              ? "High"
              : "Low"}
        </span>
      </div>
      <p className="text-sm text-muted pl-7 leading-relaxed mt-0.5">{flag.reason}</p>
      {factorsText && (
        <p className="mt-2 pl-7 text-xs text-muted/90 italic">
          Contributing factors: {factorsText}
        </p>
      )}
    </Card>
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
  const rawIndex = parseInt(visitParam ?? "0", 10);
  const maxIndex = Math.max(0, (activePatient?.analyses?.length ?? 1) - 1);
  const visitIndex = Math.min(Math.max(0, isNaN(rawIndex) ? 0 : rawIndex), maxIndex);
  const analyses = activePatient?.analyses ?? [];
  const selectedAnalysis = analyses[visitIndex] ?? analyses[0] ?? null;
  const latestAnalysis = selectedAnalysis;
  const previousAnalysis = analyses[visitIndex + 1] ?? null;
  const [copied, setCopied] = useState(false);

  if (!activePatient) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold">No patient selected</h1>
          <p className="text-muted mt-2">
            Select a patient from the dropdown to view insights
          </p>
          <Button href="/record" className="mt-4">
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
          <h1 className="text-2xl font-bold">No analysis yet</h1>
          <p className="text-muted mt-2">
            Record a visit for {activePatient.name} to generate insights
          </p>
          <Button href="/record" className="mt-4">
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
  const insightBanner = getInsightBannerMessage(latestAnalysis, previousAnalysis);
  const newFindings = getNewSinceLastVisitFindings(latestAnalysis, previousAnalysis);

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
    <PageContainer>
      <div className="space-y-6 sm:space-y-8">
        {/* Patient context */}
        <div className="pb-4 sm:pb-6 border-b border-border">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">
            {activePatient.name}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">Age {activePatient.age}</p>
          <p className="text-sm text-muted mt-2 italic">
            Supporting safer care through structured visit insights.
          </p>
          <div className="flex flex-col gap-2 mt-3 text-xs text-muted">
            <span>Visit analyzed: {formatVisitDate(latestAnalysis.timestamp)}</span>
            {analyses.length > 1 && (
              <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                <span className="text-muted shrink-0">View:</span>
                {analyses.map((a, i) => (
                  <Link
                    key={i}
                    href={`/insights?visit=${i}`}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      i === visitIndex
                        ? "bg-primary text-white"
                        : "bg-muted-bg text-foreground hover:bg-muted-bg/80"
                    }`}
                  >
                    {i === 0 ? "Latest" : i === 1 ? "Prior" : `Visit ${i + 1}`}
                  </Link>
                ))}
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

        {/* One-line insight banner */}
        <div className="rounded-lg border border-border bg-muted-bg/50 px-4 py-3 text-sm text-muted">
          {insightBanner}
        </div>

        {/* New Since Last Visit — prominent demo moment */}
        {hasMultipleVisits && newFindings.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              New Finding
            </h2>
            <Card className="border-primary/30 bg-primary-muted/20">
              <p className="text-foreground font-medium">
                {newFindings[0].text} (not present in previous visit)
              </p>
            </Card>
          </section>
        )}

        {/* Summary */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            Summary
          </h2>
          <Card className="bg-primary-muted/40 border-primary/30 shadow-sm overflow-visible">
            <p className="text-foreground text-lg leading-relaxed font-medium break-words">
              {aiSummary}
            </p>
            <p className="mt-3 text-xs text-muted">
              <span className="font-medium text-foreground">AI Confidence: {confidence.level}</span>
              <br />
              <span className="text-muted">{confidence.reasoning}</span>
            </p>
          </Card>
        </section>

        {/* Visit Summary */}
        {structuredData?.visit_summary && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              Visit Summary
            </h2>
            <Card>
              <p className="text-foreground leading-relaxed">
                {structuredData.visit_summary}
              </p>
            </Card>
          </section>
        )}

        {/* Key Observations */}
        {structuredData?.key_observations?.length ? (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              Observations
            </h2>
            <Card>
              <ul className="space-y-4 leading-7">
                {structuredData.key_observations.map((obs, i) => (
                  <li key={i} className="flex gap-2 text-foreground">
                    <span className="text-muted shrink-0">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {/* Activities Completed */}
        {structuredData?.activities_completed?.length ? (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              Activities completed
            </h2>
            <Card>
              <ul className="space-y-4 leading-7">
                {structuredData.activities_completed.map((act, i) => (
                  <li key={i} className="flex items-center gap-2 text-foreground">
                    <span className="text-success">✓</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {/* Concerns */}
        {structuredData?.concerns?.length ? (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              Watch items
            </h2>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <ul className="space-y-4 leading-7">
                {structuredData.concerns.map((c, i) => (
                  <li key={i} className="flex gap-2 text-foreground">
                    <span className="text-amber-600 dark:text-amber-400 shrink-0">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {/* Suggested Follow-ups */}
        {structuredData?.suggested_followups?.length ? (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              Recommended Follow-ups
            </h2>
            <Card>
              <ul className="space-y-4 leading-7">
                {structuredData.suggested_followups.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-foreground">
                    <span className="text-primary shrink-0">→</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {/* Trend Analysis */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            Trend Analysis
          </h2>
          <Card>
            {!hasMultipleVisits ? (
              <p className="text-sm text-muted">
                Additional visit data enables trend comparisons. Continue logging care to see changes over time.
              </p>
            ) : (
              <div className="space-y-4">
                {trendAnalysis.new_findings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-primary mb-2">New findings</p>
                    <ul className="space-y-1">
                      {trendAnalysis.new_findings.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary">
                            New
                          </span>
                          <span className="text-sm text-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trendAnalysis.worsening_signals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                      Worsening signals
                    </p>
                    <ul className="space-y-1">
                      {trendAnalysis.worsening_signals.map((s, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            Worsening
                          </span>
                          <span className="text-sm text-foreground">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trendAnalysis.improvements.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-success mb-2">Improvements</p>
                    <ul className="space-y-1">
                      {trendAnalysis.improvements.map((im, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-success/15 text-success">
                            Improved
                          </span>
                          <span className="text-sm text-foreground">{im}</span>
                        </li>
                      ))}
                    </ul>
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
            )}
          </Card>
        </section>

        {/* Clinical Risk Signals */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            Clinical Risk Signals
          </h2>
          <p className="text-xs text-muted mb-2">Prioritized by potential care impact.</p>
          {riskFlags.length ? (
            <div className="space-y-3">
              {riskFlags.map((flag, i) => (
                <RiskFlagCard
                  key={i}
                  flag={flag}
                  concerns={structuredData?.concerns ?? []}
                  observations={structuredData?.key_observations ?? []}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-muted-bg/40 text-center py-6">
              <p className="text-sm text-muted">
                No clinical risk signals for this visit
              </p>
            </Card>
          )}
        </section>

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
              Suggested Actions
            </h2>
            <Card>
              <ul className="space-y-3 leading-relaxed">
                {suggestedActions.map((action, i) => (
                  <li key={i} className="flex gap-2 text-foreground">
                    <span className="text-primary shrink-0">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {/* Transcript (collapsible) */}
        <section className="pt-4 border-t border-border">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground list-none flex items-center justify-between min-h-[44px]">
              <span>Visit transcript</span>
              <span className="text-xs">View / Copy</span>
            </summary>
            <Card className="mt-3">
              <div className="flex justify-end gap-2 mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(cleanedTranscript)}
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
        </section>

        {/* Export / Share */}
        <section className="pt-4 border-t border-border">
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            Export
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <Button size="sm" variant="outline" onClick={handleExportSummary} className="w-full sm:w-auto">
              Export Summary
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyForEMR} className="w-full sm:w-auto">
              Copy for EMR
            </Button>
            {copied && (
              <span className="text-xs text-success self-center">Copied to clipboard</span>
            )}
          </div>
        </section>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
          <Button href="/record" className="w-full sm:w-auto">Record another visit</Button>
          <Button href={`/patients/${activePatient.id}`} variant="outline" className="w-full sm:w-auto">
            View care history
          </Button>
        </div>

        {/* Transparency line */}
        <div className="pt-8 mt-8 border-t border-border">
          <p
            className="text-xs text-muted"
            title="Designed to assist, not replace, clinical judgment."
          >
            Insights generated from caregiver notes and structured clinical signals.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
