/**
 * POST /api/analyze
 *
 * AI Caregiver Co-Pilot backend route.
 * Pipeline: Clean → Structure → Risk Analysis
 *
 * Server-only. Safe for production demos.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeCaregiverTranscript, PipelineError } from "@/lib/ai/pipeline";
import { isOpenAIConfigured } from "@/lib/ai/openai";

interface AnalyzeRequestBody {
  transcript: string;
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  console.log("[api/analyze] Request received");

  try {
    // Ensure API key exists
    if (!isOpenAIConfigured()) {
      console.warn("[api/analyze] OpenAI not configured");

      return NextResponse.json(
        {
          error: "Service unavailable",
          message: "Add OPENAI_API_KEY to .env or .env.local, then restart the dev server.",
        },
        { status: 503 }
      );
    }

    // Parse request body safely
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Request body must be valid JSON.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Request body must be a JSON object.",
        },
        { status: 400 }
      );
    }

    const { transcript } = body as AnalyzeRequestBody;

    // Validate transcript
    if (typeof transcript !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Expected { transcript: string }.",
        },
        { status: 400 }
      );
    }

    const trimmed = transcript.trim();

    if (!trimmed) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "'transcript' cannot be empty.",
        },
        { status: 400 }
      );
    }

    console.log("[api/analyze] Running AI pipeline...");

    // Run AI pipeline
    const result = await analyzeCaregiverTranscript(trimmed);

    const duration = Date.now() - start;
    console.log(`[api/analyze] Success in ${duration}ms`);

    // Return full structured result
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - start;

    // Structured pipeline errors
    if (error instanceof PipelineError) {
      console.error(
        `[api/analyze] Pipeline error at step "${error.step}" (${duration}ms):`,
        error
      );

      return NextResponse.json(
        {
          error: "Pipeline error",
          message: error.message,
          step: error.step,
        },
        { status: 500 }
      );
    }

    // Misconfigured env edge case
    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      console.error("[api/analyze] Missing API key:", error.message);

      return NextResponse.json(
        {
          error: "Configuration error",
          message: error.message,
        },
        { status: 503 }
      );
    }

    // Unknown errors
    console.error(
      `[api/analyze] Unexpected error (${duration}ms):`,
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
