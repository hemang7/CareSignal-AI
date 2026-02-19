/**
 * POST /api/transcribe
 *
 * Transcribes audio using OpenAI Whisper.
 * Accepts multipart form data with an "audio" file.
 *
 * Server-side only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, isOpenAIConfigured } from "@/lib/ai/openai";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/wav",
  "audio/m4a",
];

export async function POST(request: NextRequest) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        {
          error: "Service unavailable",
          message: "Add OPENAI_API_KEY to .env or .env.local, then restart the dev server.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("audio");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Missing 'audio' file. Send as multipart/form-data.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Audio file must be under 25 MB.",
        },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const isAllowed = ALLOWED_TYPES.some(
      (t) => mimeType === t || mimeType.startsWith(t + ";")
    );
    if (!isAllowed) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: `Unsupported audio format: ${mimeType}. Use webm, mp4, mp3, wav, or m4a.`,
        },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "text",
    });

    const text = typeof transcription === "string" ? transcription : "";

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("OPENAI_API_KEY")) {
        return NextResponse.json(
          { error: "Configuration error", message: error.message },
          { status: 503 }
        );
      }
    }

    console.error("[api/transcribe] Error:", error);

    return NextResponse.json(
      {
        error: "Transcription failed",
        message: "Could not transcribe audio. Please try again.",
      },
      { status: 500 }
    );
  }
}
