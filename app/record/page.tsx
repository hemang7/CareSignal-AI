"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, Card, VoiceRecorder, Button } from "@/components";
import { usePatientStore } from "@/lib/patient-store";
import { cn } from "@/lib/utils";

type AnalyzeStatus = "idle" | "transcribing" | "analyzing" | "error";
type InputMode = "voice" | "paste";

const DEMO_TRANSCRIPT = `Patient was alert and oriented. Took morning medications at 9am without issues. Blood pressure was 128 over 82. Ate about 80% of breakfast. Noted mild fatigue but no dizziness. Mobility stable using walker. No falls reported.`;

export default function RecordPage() {
  const router = useRouter();
  const { activePatient, addAnalysisToActivePatient } = usePatientStore();
  const [transcript, setTranscript] = useState("");
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<AnalyzeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      : "Analyzing visit…";

  const handleTryDemo = () => {
    setTranscript(DEMO_TRANSCRIPT);
    setInputMode("paste");
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const panelCardBase =
    "rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-border flex flex-col overflow-hidden p-0";

  return (
    <PageContainer>
      <div className="max-w-xl lg:max-w-5xl mx-auto space-y-6 lg:space-y-8 min-w-0 w-full">
        {/* Hero */}
        <div className="text-center pt-4 animate-fade-in-up opacity-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Record a Visit
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted max-w-lg mx-auto leading-relaxed">
            Record or paste caregiver observations —{" "}
            <span className="text-primary font-medium">CareGiver AI</span> will
            extract risks, trends, and clinical insights.
          </p>
          {activePatient && (
            <p className="mt-3 text-sm text-muted/90">
              Recording for {activePatient.name} ({activePatient.age})
            </p>
          )}
        </div>

        {!activePatient && (
          <Card className="border-amber-500/40 bg-amber-500/5 rounded-xl">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Select a patient from the dropdown in the header to record a visit.
            </p>
          </Card>
        )}

        {/* Loading Banner */}
        {isLoading && (
          <Card className="bg-primary/5 border-primary/20 rounded-xl transition-opacity duration-200 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]">
            <p className="text-sm text-primary">🤖 {loadingMessage}</p>
          </Card>
        )}

        {/* Mode Toggle — mobile only */}
        {activePatient && (
          <div className="flex lg:hidden rounded-xl border border-border bg-muted-bg/30 p-1">
            <button
              type="button"
              onClick={() => setInputMode("voice")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium min-h-[44px] transition-all duration-150",
                inputMode === "voice"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              <span aria-hidden>🎙</span>
              Voice
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode("paste");
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium min-h-[44px] transition-all duration-150",
                inputMode === "paste"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              <span aria-hidden>⌨️</span>
              Paste Notes
            </button>
          </div>
        )}

        {/* Dual-panel layout: stacked on mobile, side-by-side on lg+ */}
        {activePatient && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left panel — Voice Recorder (hidden on mobile when Paste mode) */}
            <div
              className={cn(
                "flex flex-col min-h-0",
                "lg:block",
                inputMode === "voice" ? "block" : "hidden"
              )}
            >
              <Card
                className={cn(
                  panelCardBase,
                  "h-full min-h-[280px] lg:min-h-[320px]",
                  recordingBlob
                    ? "border-success/30"
                    : "border-primary/15",
                  !recordingBlob &&
                    !isLoading &&
                    "lg:shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_0_20px_rgba(99,102,241,0.06)]"
                )}
              >
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
                    Voice recording
                  </h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <VoiceRecorder
                      onRecordingComplete={(blob) => {
                        setRecordingBlob(blob);
                      }}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Right panel — Visit Notes (hidden on mobile when Voice mode) */}
            <div
              className={cn(
                "flex flex-col min-h-0",
                "lg:block",
                inputMode === "paste" ? "block" : "hidden"
              )}
            >
              <Card
                className={cn(
                  panelCardBase,
                  "h-full min-h-[280px] lg:min-h-[320px]",
                  "lg:shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_0_20px_rgba(99,102,241,0.06)]"
                )}
              >
                <div className="p-5 sm:p-6 flex flex-col flex-1 min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-sm font-medium text-muted uppercase tracking-wider">
                      Visit notes
                    </h3>
                    <button
                      type="button"
                      onClick={handleTryDemo}
                      className="text-sm text-primary hover:text-primary-hover hover:underline font-medium text-left sm:text-right"
                    >
                      Try with a sample transcript →
                    </button>
                  </div>
                  <p className="text-sm text-muted mb-4">
                    Paste raw caregiver observations — AI will clean and
                    structure them.
                  </p>
                  <textarea
                    ref={textareaRef}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Type or paste caregiver notes..."
                    rows={6}
                    className={cn(
                      "w-full flex-1 min-h-[140px] rounded-xl border border-border bg-muted-bg/30 px-4 py-4 text-sm resize-y",
                      "text-black",
                      "placeholder:text-muted/70",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                      "transition-all duration-150",
                      "disabled:opacity-60 disabled:cursor-not-allowed"
                    )}
                    disabled={isLoading || !activePatient}
                  />
                  {/* AI Promise Block */}
                  <div className="mt-4 rounded-lg border border-border/60 bg-muted-bg/20 px-4 py-3">
                    <p className="text-sm font-medium text-muted mb-2 flex items-center gap-2">
                      <span aria-hidden>✨</span>
                      What AI will extract:
                    </p>
                    <ul className="text-sm text-muted space-y-1">
                      <li>• Clinical risks</li>
                      <li>• Trend signals</li>
                      <li>• EMR-ready summary</li>
                      <li>• Follow-up suggestions</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Analyze CTA — below panels, full width, centered */}
        {activePatient && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !activePatient}
              size="lg"
              className="w-full min-h-[48px] hover:scale-[1.02] transition-transform duration-150"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden
                  />
                  {loadingMessage}
                </span>
              ) : (
                "Analyze with CareGiver AI"
              )}
            </Button>
            <p className="text-sm text-muted">
              Takes ~3–5 seconds
            </p>
          </div>
        )}

        {/* Error */}
        {status === "error" && errorMessage && (
          <Card className="border-red-500/40 bg-red-500/5 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          </Card>
        )}

        {/* Trust microcopy */}
        <p className="text-sm text-muted/60 text-center pb-8">
          Insights are AI-assisted and should support — not replace — clinical
          judgment.
        </p>
      </div>
    </PageContainer>
  );
}
