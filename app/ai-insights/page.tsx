"use client";

import { PageContainer, Card, Button } from "@/components";
import { usePatientStore } from "@/lib/patient-store";
import type { AnalysisResult, RiskFlag } from "@/types/patient";

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday ? "Today" : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface GroupedCard {
  type: string;
  title: string;
  items: string[];
  date: string;
}

function analysisToInsightCards(analysis: AnalysisResult): GroupedCard[] {
  const cards: GroupedCard[] = [];
  const dateStr = formatDate(analysis.timestamp);
  const { structuredData, risks } = analysis;

  const observations: string[] = [];
  if (structuredData?.visit_summary) {
    observations.push(structuredData.visit_summary);
  }
  if (structuredData?.key_observations?.length) {
    observations.push(...structuredData.key_observations);
  }
  if (observations.length > 0) {
    cards.push({
      type: "observation",
      title: "Observations",
      items: observations,
      date: dateStr,
    });
  }

  const reminders: string[] = [];
  if (structuredData?.medication_notes?.length) {
    reminders.push(...structuredData.medication_notes);
  }
  if (structuredData?.suggested_followups?.length) {
    reminders.push(...structuredData.suggested_followups);
  }
  if (reminders.length > 0) {
    cards.push({
      type: "reminder",
      title: "Reminders",
      items: reminders,
      date: dateStr,
    });
  }

  const recommendations: string[] = [];
  if (structuredData?.concerns?.length) {
    recommendations.push(...structuredData.concerns);
  }
  if (risks?.risk_flags?.length) {
    risks.risk_flags.forEach((flag: RiskFlag) => {
      recommendations.push(`${flag.risk}: ${flag.reason}`);
    });
  }
  if (recommendations.length > 0) {
    cards.push({
      type: "recommendation",
      title: "Recommendations",
      items: recommendations,
      date: dateStr,
    });
  }

  return cards;
}

export default function AIInsightsPage() {
  const { activePatient } = usePatientStore();
  const latestAnalysis = activePatient?.analyses[0] ?? null;
  const insightCards = latestAnalysis
    ? analysisToInsightCards(latestAnalysis)
    : [];

  const typeStyles: Record<string, string> = {
    observation: "bg-accent-muted text-accent",
    reminder: "bg-primary-muted text-primary",
    recommendation: "bg-secondary-muted text-secondary",
  };

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

  return (
    <PageContainer>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Insights
          </h1>
          <p className="text-muted mt-1">
            Analysis of visit notes for{" "}
            <span className="font-medium text-foreground">
              {activePatient.name} ({activePatient.age})
            </span>
          </p>
        </div>

        {insightCards.length > 0 ? (
          <div className="space-y-4">
            {insightCards.map((insight, i) => (
              <Card key={i} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      typeStyles[insight.type] ?? "bg-muted-bg text-muted"
                    }`}
                  >
                    {insight.type}
                  </span>
                  <span className="text-xs text-muted">{insight.date}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {insight.title}
                </h3>
                <ul className="space-y-1.5 text-muted text-sm leading-relaxed list-disc list-inside">
                  {insight.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-border bg-muted-bg/50">
            <div className="text-center py-8 space-y-4">
              <p className="text-muted">
                No insights yet for {activePatient.name}. Record a visit to
                generate analysis.
              </p>
              <Button href="/record">Record Visit</Button>
            </div>
          </Card>
        )}

        {insightCards.length > 0 && (
          <Card className="border-dashed border-2 border-border bg-muted-bg/50">
            <div className="text-center py-4 space-y-4">
              <p className="text-muted text-sm">
                Record another visit to generate new insights
              </p>
              <Button href="/record">Record Visit</Button>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
