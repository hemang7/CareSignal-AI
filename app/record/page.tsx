"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, Card, VoiceRecorder, Button } from "@/components";
import { usePatientStore } from "@/lib/patient-store";

type AnalyzeStatus = "idle" | "transcribing" | "analyzing" | "error";

const DEMO_TRANSCRIPT = `Patient was alert and oriented. Took morning medications at 9am without issues. Blood pressure was 128 over 82. Ate about 80% of breakfast. Noted mild fatigue but no dizziness. Mobility stable using walker. No falls reported.`;

export default function RecordPage() {
  const router = useRouter();
  const { activePatient, addAnalysisToActivePatient } = usePatientStore();
  const [transcript, setTranscript] = useState("");
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<AnalyzeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!activePatient) {
      setStatus("error");
      setErrorMessage("Please select a patient from the dropdown above.");
      return;
    }

    let textToAnalyze = transcript.trim();

    if (!textToAnalyze && recordingBlob) {
      setStatus("transcribing");
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append("audio", recordingBlob, "recording.webm");

        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const transcribeData = await transcribeRes.json();
        if (!transcribeRes.ok) {
          throw new Error(transcribeData?.message ?? "Transcription failed");
        }

        textToAnalyze = (transcribeData.text ?? "").trim();
        setTranscript(textToAnalyze);

        if (!textToAnalyze) {
          throw new Error("No speech detected in recording.");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Transcription failed"
        );
        return;
      }
    }

    if (!textToAnalyze) {
      setStatus("error");
      setErrorMessage(
        "Please record voice notes, enter text, or paste a transcript. The textarea is empty."
      );
      return;
    }

    setStatus("analyzing");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: textToAnalyze }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Analysis failed");

      addAnalysisToActivePatient(data);
      router.push("/insights");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Unexpected error occurred"
      );
    }
  };

  const isLoading = status === "transcribing" || status === "analyzing";
  const loadingMessage =
    status === "transcribing"
      ? "Transcribing your recording..."
      : "Analyzing visit notes...";

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto space-y-8 min-w-0 w-full">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Record Visit</h1>
          <p className="text-sm sm:text-base text-muted mt-1 px-2">
            Record voice notes or type/paste your visit transcript for analysis
          </p>
          {activePatient && (
            <p className="text-sm text-muted mt-2">
              Recording for <span className="font-medium text-foreground">{activePatient.name} ({activePatient.age})</span>
            </p>
          )}
        </div>

        {!activePatient && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Select a patient from the dropdown in the header to record a visit.
            </p>
          </Card>
        )}

        {/* Loading Banner */}
        {isLoading && (
          <Card className="bg-primary/5 border-primary/20">
            <p className="text-sm text-primary">🤖 {loadingMessage}</p>
          </Card>
        )}

        {/* Voice Recorder */}
        <Card>
          <VoiceRecorder
            onRecordingComplete={(blob) => {
              setRecordingBlob(blob);
            }}
          />
        </Card>

        {/* Transcript Input */}
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Visit transcript</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTranscript(DEMO_TRANSCRIPT)}
            >
              Try demo
            </Button>
          </div>
          <p className="text-xs text-muted">
            Record above, or type/paste notes below. If you recorded, click
            Analyze to transcribe and analyze.
          </p>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Type or paste caregiver notes..."
            rows={6}
            className="w-full rounded-lg border px-4 py-3 text-sm resize-y"
            disabled={isLoading || !activePatient}
          />

          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !activePatient}
          >
            {isLoading ? loadingMessage : "Analyze visit"}
          </Button>
        </Card>

        {/* Error */}
        {status === "error" && errorMessage && (
          <Card className="border-red-500/40 bg-red-500/5">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
