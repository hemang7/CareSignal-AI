"use client";

import type { RiskFlag } from "@/types/patient";
import { getHighestRiskSeverity } from "@/lib/insights-utils";

type SeverityLevel = "high" | "medium" | "low";

function getBannerConfig(riskFlags: RiskFlag[]): {
  level: SeverityLevel;
  title: string;
  subtitle: string;
  styles: string;
} {
  const highest = getHighestRiskSeverity(riskFlags);

  if (highest === "high" || riskFlags.some((r) => r.severity?.toLowerCase() === "high")) {
    const topics = riskFlags
      .filter((r) => r.severity?.toLowerCase() === "high")
      .map((r) => r.risk)
      .slice(0, 2);
    return {
      level: "high",
      title: "High risk detected — clinical follow-up recommended",
      subtitle: topics.length > 0
        ? `${topics.join(" and ")} identified in latest visit.`
        : "Risks identified in latest visit.",
      styles:
        "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300 border",
    };
  }

  if (highest === "medium" || riskFlags.length > 0) {
    return {
      level: "medium",
      title: "Patient requires monitoring",
      subtitle: "Moderate risks detected. Continued observation recommended.",
      styles:
        "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 border",
    };
  }

  return {
    level: "low",
    title: "Patient currently stable",
    subtitle: "No significant risks detected in latest visit.",
    styles:
      "bg-success/15 border-success/40 text-success border",
  };
}

export function PatientSafetyBanner({ riskFlags }: { riskFlags: RiskFlag[] }) {
  const config = getBannerConfig(riskFlags);
  const icon =
    config.level === "high" ? "🔴" : config.level === "medium" ? "🟡" : "🟢";

  return (
    <div
      className={`rounded-lg px-4 py-3 border ${config.styles}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">
        {icon} {config.title}
      </p>
      <p className="text-sm mt-0.5 opacity-90">{config.subtitle}</p>
      <p className="text-xs mt-2 opacity-75">
        AI-assisted insights. Not a clinical diagnosis.
      </p>
    </div>
  );
}
