/**
 * AI Caregiver Co-Pilot — Visit Processing Pipeline
 *
 * Chained pipeline: Clean → Structure → Analyze Risks
 * Server-side only. Uses OpenAI SDK.
 */

import OpenAI from "openai";
import { getOpenAIClient } from "./openai";
import {
  TRANSCRIPT_CLEANER,
  CLINICAL_STRUCTURER,
  RISK_ANALYZER,
} from "./prompts";

// =============================================================================
// Types
// =============================================================================

/** Structured visit data from CLINICAL_STRUCTURER */
export interface StructuredVisitData {
  visit_summary?: string;
  key_observations?: string[];
  activities_completed?: string[];
  medication_notes?: string[];
  concerns?: string[];
  suggested_followups?: string[];
  care_level_indicator?: "stable" | "watch" | "attention_needed";
}

/** Single risk flag from RISK_ANALYZER */
export interface RiskFlag {
  risk: string;
  severity: "low" | "medium" | "high";
  reason: string;
}

/** Risk analysis output */
export interface RiskAnalysis {
  risk_flags: RiskFlag[];
}

/** Pipeline result */
export interface PipelineResult {
  cleanedTranscript: string;
  structuredData: StructuredVisitData;
  risks: RiskAnalysis;
}

/** Pipeline error with context */
export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly step: "clean" | "structure" | "analyze",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

// =============================================================================
// Config
// =============================================================================

const MODEL = "gpt-4o-mini";

// =============================================================================
// Step 1: Clean Transcript
// =============================================================================

/**
 * Cleans and normalizes raw voice-to-text transcript.
 * Removes filler words, fixes ASR errors, standardizes medical terms.
 */
export async function cleanTranscript(
  rawText: string,
  client?: OpenAI
): Promise<string> {
  const openai = client ?? getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: TRANSCRIPT_CLEANER },
      {
        role: "user",
        content: `Clean this transcript:\n\n${rawText.trim()}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new PipelineError(
      "No output from transcript cleaning step",
      "clean"
    );
  }

  return content;
}

// =============================================================================
// Step 2: Structure Visit Data
// =============================================================================

/**
 * Structures cleaned transcript into structured JSON.
 * Extracts observations, vitals, medications, concerns, actions.
 */
export async function structureVisitData(
  cleanedTranscript: string,
  client?: OpenAI
): Promise<StructuredVisitData> {
  const openai = client ?? getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },

    messages: [
      { role: "system", content: CLINICAL_STRUCTURER },
      {
        role: "user",
        content: `Structure these visit notes:\n\n${cleanedTranscript}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new PipelineError(
      "No output from clinical structuring step",
      "structure"
    );
  }

  return parseStructuredData(content);
}

// =============================================================================
// Step 3: Analyze Risks
// =============================================================================

/**
 * Analyzes structured visit data for risks and safety concerns.
 * Returns prioritized risk flags with severity.
 */
export async function analyzeRisks(
  structuredData: StructuredVisitData,
  client?: OpenAI
): Promise<RiskAnalysis> {
  const openai = client ?? getOpenAIClient();

  const inputForRisks = JSON.stringify(structuredData, null, 2);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },

    messages: [
      { role: "system", content: RISK_ANALYZER },
      {
        role: "user",
        content: `Analyze risks from this structured visit data:\n\n${inputForRisks}`,
      },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new PipelineError(
      "No output from risk analysis step",
      "analyze"
    );
  }

  return parseRiskAnalysis(content);
}

// =============================================================================
// JSON Parsing
// =============================================================================

function parseStructuredData(content: string): StructuredVisitData {
  const json = extractJson(content);

  try {
    const parsed = JSON.parse(json) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return createEmptyStructuredData();
    }

    return normalizeStructuredData(parsed);
  } catch {
    return createEmptyStructuredData();
  }
}

function parseRiskAnalysis(content: string): RiskAnalysis {
  const json = extractJson(content);

  try {
    const parsed = JSON.parse(json) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return { risk_flags: [] };
    }

    const obj = parsed as Record<string, unknown>;
    const flags = Array.isArray(obj.risk_flags) ? obj.risk_flags : [];

    return {
      risk_flags: flags
        .filter(isValidRiskFlag)
        .map((f) => ({
          risk: typeof f.risk === "string" ? f.risk : "",
          severity: normalizeSeverity(f.severity),
          reason: typeof f.reason === "string" ? f.reason : "",
        })),
    };
  } catch {
    return { risk_flags: [] };
  }
}

function extractJson(content: string): string {
  const trimmed = content.trim();

  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
  const codeBlockMatch = codeBlockRegex.exec(trimmed);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}") + 1;
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end);
  }

  return trimmed;
}

function createEmptyStructuredData(): StructuredVisitData {
  return {
    visit_summary: "",
    key_observations: [],
    activities_completed: [],
    medication_notes: [],
    concerns: [],
    suggested_followups: [],
    care_level_indicator: "stable",
  };
}

function normalizeStructuredData(parsed: unknown): StructuredVisitData {
  const obj = parsed as Record<string, unknown>;
  const toArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")) : [];

  return {
    visit_summary: typeof obj.visit_summary === "string" ? obj.visit_summary : "",
    key_observations: toArray(obj.key_observations),
    activities_completed: toArray(obj.activities_completed),
    medication_notes: toArray(obj.medication_notes),
    concerns: toArray(obj.concerns),
    suggested_followups: toArray(obj.suggested_followups),
    care_level_indicator: isValidCareLevel(obj.care_level_indicator)
      ? obj.care_level_indicator
      : "stable",
  };
}

function isValidCareLevel(
  v: unknown
): v is "stable" | "watch" | "attention_needed" {
  return v === "stable" || v === "watch" || v === "attention_needed";
}

function isValidRiskFlag(v: unknown): v is { risk?: unknown; severity?: unknown; reason?: unknown } {
  return v !== null && typeof v === "object";
}

function normalizeSeverity(v: unknown): "low" | "medium" | "high" {
  const s = (typeof v === "string" ? v : "").toLowerCase();
  if (s === "medium" || s === "moderate") return "medium";
  if (s === "high" || s === "urgent") return "high";
  return "low";
}

// =============================================================================
// Main Pipeline
// =============================================================================

/**
 * Runs the full caregiver transcript analysis pipeline:
 * 1. Clean transcript
 * 2. Structure visit data
 * 3. Analyze risks
 *
 * @param text - Raw transcript from voice-to-text
 * @returns Pipeline result with cleaned transcript, structured data, and risks
 * @throws PipelineError when a step fails
 */
export async function analyzeCaregiverTranscript(
  text: string,
  client?: OpenAI
): Promise<PipelineResult> {
  const trimmed = text?.trim() ?? "";

  if (!trimmed) {
    throw new PipelineError(
      "Input text cannot be empty",
      "clean"
    );
  }

  return analyzeCaregiverTranscriptInternal(trimmed, client);
}

async function analyzeCaregiverTranscriptInternal(
  text: string,
  client?: OpenAI
): Promise<PipelineResult> {
  const openai = client ?? getOpenAIClient();

  const cleanedTranscript = await cleanTranscript(text, openai).catch((err) => {
    throw new PipelineError(
      err instanceof Error ? err.message : "Transcript cleaning failed",
      "clean",
      err
    );
  });

  const structuredData = await structureVisitData(
    cleanedTranscript,
    openai
  ).catch((err) => {
    throw new PipelineError(
      err instanceof Error ? err.message : "Clinical structuring failed",
      "structure",
      err
    );
  });

  const risks = await analyzeRisks(structuredData, openai).catch((err) => {
    throw new PipelineError(
      err instanceof Error ? err.message : "Risk analysis failed",
      "analyze",
      err
    );
  });

  return {
    cleanedTranscript,
    structuredData,
    risks,
  };
}
