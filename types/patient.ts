/**
 * Patient and analysis types for session-scoped multi-patient workflow
 */

export interface RiskFlag {
  risk: string;
  severity: string;
  reason: string;
}

export interface StructuredVisitData {
  visit_summary?: string;
  key_observations?: string[];
  activities_completed?: string[];
  medication_notes?: string[];
  concerns?: string[];
  suggested_followups?: string[];
  care_level_indicator?: string;
}

export interface AnalysisResult {
  cleanedTranscript: string;
  structuredData: StructuredVisitData;
  risks: { risk_flags: RiskFlag[] };
  timestamp: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  analyses: AnalysisResult[];
}
