/**
 * Client-side intelligence helpers for decision-support insights.
 * No backend, no persistence — deterministic logic only.
 */

import type { AnalysisResult, RiskFlag } from "@/types/patient";

export interface TrendAnalysis {
  new_findings: string[];
  worsening_signals: string[];
  improvements: string[];
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().trim().replace(/\.+$/, "");
}

export function computeTrendAnalysis(
  latest: AnalysisResult,
  previous: AnalysisResult | null
): TrendAnalysis {
  const result: TrendAnalysis = {
    new_findings: [],
    worsening_signals: [],
    improvements: [],
  };

  if (!previous) return result;

  const latestConcerns = (latest.structuredData?.concerns ?? []).map(normalizeForCompare);
  const prevConcerns = (previous.structuredData?.concerns ?? []).map(normalizeForCompare);
  const latestObs = (latest.structuredData?.key_observations ?? []).map(normalizeForCompare);
  const prevObs = (previous.structuredData?.key_observations ?? []).map(normalizeForCompare);
  const latestRisks = latest.risks?.risk_flags ?? [];
  const prevRisks = previous.risks?.risk_flags ?? [];

  // New findings: in latest but not in previous
  const prevSet = new Set([...prevConcerns, ...prevObs]);
  for (const c of latestConcerns) {
    if (!prevSet.has(c)) result.new_findings.push(c);
  }
  for (const o of latestObs) {
    if (!prevSet.has(o)) result.new_findings.push(o);
  }

  // Worsening: same risk with higher severity, or risk present now that wasn't before
  const prevRiskSeverity: Record<string, string> = {};
  prevRisks.forEach((r) => {
    prevRiskSeverity[r.risk.toLowerCase()] = r.severity.toLowerCase();
  });
  for (const r of latestRisks) {
    const name = r.risk.toLowerCase();
    const sev = r.severity.toLowerCase();
    const prevSev = prevRiskSeverity[name];
    if (!prevSev) {
      result.worsening_signals.push(`${r.risk} newly identified`);
    } else if (
      (sev === "high" && prevSev !== "high") ||
      (sev === "medium" && prevSev === "low")
    ) {
      result.worsening_signals.push(`${r.risk} severity increased`);
    }
  }

  // Improvements: in previous but not in latest
  const latestSet = new Set([...latestConcerns, ...latestObs]);
  for (const c of prevConcerns) {
    if (!latestSet.has(c)) result.improvements.push(c);
  }
  for (const o of prevObs) {
    if (!latestSet.has(o)) result.improvements.push(o);
  }

  return result;
}

export function getTrendIndicatorForTimeline(
  analysis: AnalysisResult,
  previous: AnalysisResult | null
): string | null {
  if (!previous) return null;
  const trend = computeTrendAnalysis(analysis, previous);
  if (trend.worsening_signals.length > 0) {
    const s = trend.worsening_signals[0];
    return s.includes("newly identified")
      ? `${s.replace(" newly identified", "")} observed compared to prior visit`
      : s;
  }
  if (trend.new_findings.length > 0) {
    return `${trend.new_findings[0]} compared to prior visit`;
  }
  return null;
}

export function deriveAISummaryShort(analysis: AnalysisResult): string {
  const { structuredData, risks } = analysis;
  const summary = structuredData?.visit_summary ?? "";
  const highRisks = (risks?.risk_flags ?? []).filter((r) => r.severity?.toLowerCase() === "high");
  if (highRisks.length > 0) {
    const topics = highRisks.map((r) => r.risk.toLowerCase());
    return topics.length === 1
      ? `${topics[0]} noted; may warrant attention`
      : `Multiple risks: ${topics.join(", ")}`;
  }
  return summary || "Visit recorded";
}

export function getHighestRiskSeverity(risks: RiskFlag[]): "high" | "medium" | "low" | null {
  if (!risks.length) return null;
  const hasHigh = risks.some((r) => r.severity?.toLowerCase() === "high");
  const hasMedium = risks.some(
    (r) => r.severity?.toLowerCase() === "medium" || r.severity?.toLowerCase() === "moderate"
  );
  return hasHigh ? "high" : hasMedium ? "medium" : "low";
}

export function generateEscalation(risks: RiskFlag[]): string[] {
  const actions: string[] = [];
  const highRisks = risks.filter((r) => r.severity?.toLowerCase() === "high");
  const mediumRisks = risks.filter(
    (r) => r.severity?.toLowerCase() === "medium" || r.severity?.toLowerCase() === "moderate"
  );
  const hasFallRisk = risks.some((r) => r.risk.toLowerCase().includes("fall"));
  const hasMedRisk = risks.some(
    (r) =>
      r.risk.toLowerCase().includes("medication") ||
      r.risk.toLowerCase().includes("med")
  );

  if (highRisks.length > 0) {
    actions.push("Consider notifying supervising nurse or clinician today.");
  }
  if (mediumRisks.length >= 2) {
    actions.push("Monitor closely over the next 24 hours.");
  }
  if (hasFallRisk) {
    actions.push("Fall prevention measures may be warranted: clear pathways, adequate lighting, mobility assistance.");
  }
  if (hasMedRisk) {
    actions.push("Medication adherence and side effects may warrant review.");
  }
  if (actions.length === 0 && risks.length > 0) {
    actions.push("Continue routine monitoring.");
  }
  return actions;
}

export function getContributingSignals(
  flag: RiskFlag,
  concerns: string[],
  observations: string[]
): string[] {
  const keywords = flag.risk.toLowerCase().split(/\s+/);
  const reasonWords = flag.reason.toLowerCase().split(/\s+/);
  const searchTerms = [...keywords, ...reasonWords].filter((w) => w.length > 3);
  const signals: string[] = [];

  const all = [...concerns, ...observations];
  for (const item of all) {
    const lower = item.toLowerCase();
    if (searchTerms.some((t) => lower.includes(t))) {
      signals.push(item);
    }
  }
  return signals.length > 0 ? signals : [flag.reason];
}

export const RISK_KEYWORDS = [
  "dizzy",
  "dizziness",
  "fall",
  "confusion",
  "confused",
  "swelling",
  "swollen",
  "pain",
  "unsteady",
  "unsteadiness",
];

export function getRiskyPhraseRanges(text: string): { start: number; end: number }[] {
  if (!text) return [];
  const ranges: { start: number; end: number }[] = [];
  const regex = new RegExp(RISK_KEYWORDS.join("|"), "gi");
  let match;
  while ((match = regex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

export function computeAIConfidence(analysis: AnalysisResult): {
  level: "Low" | "Medium" | "High";
  reasoning: string;
} {
  let score = 0;
  const { cleanedTranscript, structuredData, risks } = analysis;
  const transcriptLen = cleanedTranscript?.length ?? 0;
  const riskCount = risks?.risk_flags?.length ?? 0;

  let populatedFields = 0;
  if (structuredData?.visit_summary) populatedFields++;
  if ((structuredData?.key_observations?.length ?? 0) > 0) populatedFields++;
  if ((structuredData?.activities_completed?.length ?? 0) > 0) populatedFields++;
  if ((structuredData?.concerns?.length ?? 0) > 0) populatedFields++;
  if ((structuredData?.suggested_followups?.length ?? 0) > 0) populatedFields++;
  if ((structuredData?.medication_notes?.length ?? 0) > 0) populatedFields++;

  if (transcriptLen > 150) score += 1;
  if (populatedFields > 4) score += 1;
  if (riskCount >= 2) score += 1;
  if (transcriptLen < 50) score -= 1;
  if (
    (structuredData?.concerns?.length ?? 0) === 0 &&
    (structuredData?.key_observations?.length ?? 0) === 0
  )
    score -= 1;

  const level: "Low" | "Medium" | "High" =
    score <= 1 ? "Low" : score === 2 ? "Medium" : "High";

  let reasoning: string;
  if (level === "High") {
    reasoning =
      riskCount >= 2 && populatedFields > 4
        ? "Based on multiple corroborating symptoms and consistent transcript detail."
        : "Based on sufficient transcript detail and structured clinical data.";
  } else if (level === "Medium") {
    reasoning =
      transcriptLen < 100
        ? "Limited transcript detail reduces certainty."
        : "Moderate data completeness; some nuance may be missed.";
  } else {
    reasoning =
      transcriptLen < 50
        ? "Very short transcript limits reliability."
        : "Limited structured data extracted; consider adding more detail.";
  }

  return { level, reasoning };
}

export function getTrendLabels(
  analysis: AnalysisResult,
  previous: AnalysisResult | null
): { type: "new" | "worsening" | "improved"; label: string }[] {
  if (!previous) return [];
  const trend = computeTrendAnalysis(analysis, previous);
  const labels: { type: "new" | "worsening" | "improved"; label: string }[] = [];
  if (trend.new_findings.length > 0) {
    labels.push({ type: "new", label: "New" });
  }
  if (trend.worsening_signals.length > 0) {
    labels.push({ type: "worsening", label: "Worsening" });
  }
  if (trend.improvements.length > 0) {
    labels.push({ type: "improved", label: "Improved" });
  }
  return labels;
}

/** Returns the most impactful "new since last visit" finding for prominent display */
export function getNewSinceLastVisitFindings(
  latest: AnalysisResult,
  previous: AnalysisResult | null
): { text: string; type: "risk" | "concern" | "observation" }[] {
  if (!previous) return [];
  const trend = computeTrendAnalysis(latest, previous);
  const items: { text: string; type: "risk" | "concern" | "observation" }[] = [];
  for (const s of trend.worsening_signals) {
    if (s.includes("newly identified")) {
      items.push({ text: s.replace(" newly identified", ""), type: "risk" });
    } else {
      items.push({ text: s, type: "risk" });
    }
  }
  for (const f of trend.new_findings) {
    items.push({ text: f, type: "concern" });
  }
  return items;
}

/** One-line insight banner based on visit comparison and risk profile */
export function getInsightBannerMessage(
  latest: AnalysisResult,
  previous: AnalysisResult | null
): string {
  const riskFlags = latest.risks?.risk_flags ?? [];
  const highCount = riskFlags.filter((r) => r.severity?.toLowerCase() === "high").length;
  const multiRisk = riskFlags.length >= 2;

  if (previous) {
    const trend = computeTrendAnalysis(latest, previous);
    if (trend.worsening_signals.length > 0 || trend.new_findings.length > 0) {
      return "Notable change observed since last visit.";
    }
    if (trend.improvements.length > 0 && riskFlags.length === 0) {
      return "Condition appears stable compared to prior visit.";
    }
  }

  if (multiRisk && highCount > 0) {
    return "Multiple risk signals identified.";
  }
  if (multiRisk) {
    return "Several areas warrant attention.";
  }
  if (highCount > 0) {
    return "Risk signal noted.";
  }
  if (previous) {
    return "Condition appears stable compared to prior visit.";
  }
  return "Visit documented. No significant concerns noted.";
}

/** AI snapshot text for dashboard: 1–2 sentences on change or status */
export function deriveAISnapshotText(
  latest: AnalysisResult,
  previous: AnalysisResult | null
): string {
  const trend = previous ? computeTrendAnalysis(latest, previous) : null;
  const summary = latest.structuredData?.visit_summary ?? "";
  const riskFlags = latest.risks?.risk_flags ?? [];

  if (trend && (trend.worsening_signals.length > 0 || trend.new_findings.length > 0)) {
    const parts: string[] = [];
    if (trend.worsening_signals.length > 0) {
      const first = trend.worsening_signals[0].replace(" newly identified", "");
      parts.push(`${first} compared to prior visit.`);
    }
    if (trend.new_findings.length > 0) {
      parts.push(`New: ${trend.new_findings[0]}${trend.new_findings.length > 1 ? `. ${trend.new_findings[1]}` : ""}.`);
    }
    return parts.join(" ") || summary || "Notable changes observed.";
  }

  if (riskFlags.length > 0) {
    const topics = riskFlags.slice(0, 2).map((r) => r.risk.toLowerCase());
    return topics.length === 1
      ? `Patient stable overall with ${topics[0]} noted.`
      : `Patient stable overall with mild concerns: ${topics.join(", ")}.`;
  }
  return summary || "Patient stable overall with no significant concerns.";
}

/** Lightweight trend chips for dashboard */
export function deriveTrendChips(
  latest: AnalysisResult,
  previous: AnalysisResult | null
): { label: string; direction: "up" | "down" | "stable" }[] {
  if (!previous) return [];
  const trend = computeTrendAnalysis(latest, previous);
  const chips: { label: string; direction: "up" | "down" | "stable" }[] = [];

  const hasConfusion = trend.new_findings.some((f) =>
    /confusion|confused|cognition|cognitive/.test(f.toLowerCase())
  ) || trend.worsening_signals.some((s) =>
    /confusion|confused|cognition/.test(s.toLowerCase())
  );
  if (hasConfusion) chips.push({ label: "Cognition declining", direction: "up" });

  const hasFallRisk = trend.worsening_signals.some((s) =>
    /fall|mobility|unsteady/.test(s.toLowerCase())
  ) || trend.new_findings.some((f) =>
    /fall|mobility|unsteady|dizzy/.test(f.toLowerCase())
  );
  if (hasFallRisk) chips.push({ label: "Risk increasing", direction: "up" });

  const hasImprovement = trend.improvements.length > 0;
  if (hasImprovement) chips.push({ label: "Some areas improving", direction: "down" });

  if (chips.length === 0) {
    chips.push({ label: "Stable overall", direction: "stable" });
  }

  return chips;
}

/** One-line key takeaway for dashboard */
export function deriveKeyTakeaway(
  latest: AnalysisResult,
  previous: AnalysisResult | null
): string {
  const trend = previous ? computeTrendAnalysis(latest, previous) : null;
  const risks = latest.risks?.risk_flags ?? [];
  const concerns = latest.structuredData?.concerns ?? [];
  const highRisks = risks.filter((r) => r.severity?.toLowerCase() === "high");

  if (trend && (trend.worsening_signals.length > 0 || trend.new_findings.length > 0)) {
    const parts: string[] = [];
    if (trend.worsening_signals[0]) {
      parts.push(trend.worsening_signals[0].replace(" newly identified", ""));
    }
    if (trend.new_findings[0]) {
      parts.push(trend.new_findings[0]);
    }
    return `${parts.join(" and ")} suggest monitoring.`;
  }

  if (highRisks.length > 0) {
    const topics = highRisks.map((r) => r.risk.toLowerCase()).slice(0, 2);
    return `${topics.join(" and ")} may warrant attention.`;
  }
  if (concerns.length > 0) {
    return `Monitor ${concerns[0].toLowerCase().replace(/\.+$/, "")}.`;
  }
  const first = latest.structuredData?.visit_summary?.split(".")[0]?.trim();
  return first ? `${first}.` : "Visit documented. No acute concerns.";
}

/** Count of risks that are new in latest vs previous */
export function countNewRisksSincePrior(
  latest: AnalysisResult,
  previous: AnalysisResult | null
): number {
  if (!previous) return 0;
  const prevNames = new Set(
    (previous.risks?.risk_flags ?? []).map((r) => r.risk.toLowerCase())
  );
  return (latest.risks?.risk_flags ?? []).filter(
    (r) => !prevNames.has(r.risk.toLowerCase())
  ).length;
}

/** Sort risks by severity: High → Moderate → Low */
export function sortRisksBySeverity(risks: RiskFlag[]): RiskFlag[] {
  const order = (s: string) => {
    const x = s?.toLowerCase() ?? "low";
    if (x === "high") return 0;
    if (x === "medium" || x === "moderate") return 1;
    return 2;
  };
  return [...risks].sort((a, b) => order(a.severity) - order(b.severity));
}

function normalizeRiskTitleForEMR(risk: string): string {
  const r = risk.toLowerCase();
  if (r.includes("medication")) return "Medication concern";
  if (r.includes("fatigue") || r.includes("deterioration")) return "Possible deterioration";
  if (r.includes("fall")) return "Fall risk";
  if (r.includes("mobility")) return "Mobility concern";
  return risk;
}

function capitalizeSeverity(s: string): string {
  const x = s?.toLowerCase() ?? "low";
  if (x === "medium" || x === "moderate") return "Moderate";
  if (x === "high") return "High";
  return "Low";
}

function toClinicalAssessment(summary: string): string {
  if (!summary?.trim()) return "No acute concerns noted during visit.";
  const s = summary.trim();
  return s
    .replace(/^(mr\.|mrs\.|ms\.)\s+[\w\s]+\s+(exhibited|was|demonstrated|showed)\s+/i, "Patient $2 ")
    .replace(/\b(indicates|indicate)\b/gi, "may suggest")
    .replace(/\b(confirms|confirm)\b/gi, "consistent with")
    .replace(/\b(detected|detect)\b/gi, "observed")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function softenReason(r: string): string {
  return r
    .replace(/\b(indicates|indicate)\b/gi, "may suggest")
    .replace(/\b(confirms|confirm)\b/gi, "consistent with")
    .replace(/\b(detected|detect)\b/gi, "observed")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function buildEMRExportText(
  patientName: string,
  patientAge: number,
  dateStr: string,
  visitSummary: string,
  riskFlags: RiskFlag[],
  suggestedActions: string[]
): string {
  const assessment = toClinicalAssessment(visitSummary);
  const riskLines = riskFlags.map(
    (f) => `- ${normalizeRiskTitleForEMR(f.risk)} (${capitalizeSeverity(f.severity)}): ${softenReason(f.reason)}`
  );
  const planLines = suggestedActions.map((a) => `- ${a}`);

  const lines = [
    `Patient: ${patientName}, Age ${patientAge}`,
    `Date: ${dateStr}`,
    "",
    "Assessment",
    assessment,
    "",
    "Clinical Risks",
    riskLines.length > 0 ? riskLines.join("\n") : "None identified.",
    "",
    "Plan",
    planLines.length > 0 ? planLines.join("\n") : "Continue routine monitoring.",
  ];
  return lines.join("\n");
}
