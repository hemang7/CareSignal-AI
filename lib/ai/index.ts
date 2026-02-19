/**
 * AI pipeline and logic for caregiver assistance
 */

export { getOpenAIClient, isOpenAIConfigured } from "./openai";
export {
  SYSTEM_PROMPT,
  CAREGIVER_GREETING,
  TRANSCRIPT_CLEANER,
  CLINICAL_STRUCTURER,
  RISK_ANALYZER,
  FRIENDLY_SUMMARY,
  ANALYSIS_SYSTEM_PROMPT,
} from "./prompts";
export {
  analyzeCaregiverTranscript,
  cleanTranscript,
  structureVisitData,
  analyzeRisks,
  PipelineError,
  type PipelineResult,
  type StructuredVisitData,
  type RiskAnalysis,
  type RiskFlag,
} from "./pipeline";
