"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

/** Recording state discriminated union for type-safe handling */
export type RecordingState =
  | { status: "idle" }
  | { status: "recording"; duration: number }
  | { status: "processing" }
  | { status: "recorded"; blob: Blob; duration: number };

export interface VoiceRecorderProps {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const SUPPORTED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function getSupportedMimeType(): string | undefined {
  if (typeof window === "undefined" || !window.MediaRecorder) return undefined;
  return SUPPORTED_MIME_TYPES.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({
  onRecordingComplete,
  onError,
  className,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>({ status: "idle" });
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    durationRef.current = 0;
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setState((prev) =>
        prev.status === "recording"
          ? { ...prev, duration: durationRef.current }
          : prev
      );
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stopTimer();
        cleanup();

        if (chunksRef.current.length === 0) {
          setState({ status: "idle" });
          onError?.(new Error("No audio data recorded"));
          return;
        }

        setState({ status: "processing" });

        const blob = new Blob(chunksRef.current, {
          type: mimeType ?? "audio/webm",
        });
        const duration = durationRef.current;

        requestAnimationFrame(() => {
          setState({ status: "recorded", blob, duration });
          onRecordingComplete?.(blob, duration);
        });
      };

      mediaRecorder.start(100);
      startTimer();
      setState({ status: "recording", duration: 0 });
    } catch (err) {
      cleanup();
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name === "NotAllowedError") {
        setIsPermissionDenied(true);
      }
      onError?.(error);
      setState({ status: "idle" });
    }
  }, [cleanup, onError, onRecordingComplete, startTimer, stopTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setState({ status: "idle" });
  }, []);

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        !!window.MediaRecorder
    );
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  if (isSupported === false) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted-bg/50 p-6 text-center",
          className
        )}
      >
        <p className="text-muted text-sm">
          Voice recording is not supported in your browser. Please use Chrome,
          Firefox, Safari, or Edge.
        </p>
      </div>
    );
  }

  if (isPermissionDenied) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted-bg/50 p-6 text-center space-y-4",
          className
        )}
      >
        <p className="text-muted text-sm">
          Microphone access was denied. Please enable it in your browser
          settings to record.
        </p>
        <button
          onClick={() => setIsPermissionDenied(false)}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const isIdle = state.status === "idle";
  const isRecording = state.status === "recording";
  const isProcessing = state.status === "processing";
  const isRecorded = state.status === "recorded";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Microphone button */}
      <div className="flex flex-col items-center gap-6">
        <div
          className={cn(
            "w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-300",
            isRecording && "bg-primary-muted scale-105 animate-pulse",
            isProcessing && "bg-muted-bg",
            isRecorded && "bg-success/10",
            isIdle && "bg-muted-bg"
          )}
        >
          {isIdle && (
            <button
              onClick={startRecording}
              disabled={isSupported === null}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary hover:bg-primary-hover flex items-center justify-center transition-all duration-150 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start recording"
            >
              <MicrophoneIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary hover:bg-primary-hover flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Stop recording"
            >
              <StopIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </button>
          )}

          {isProcessing && (
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-muted flex items-center justify-center"
              aria-label="Processing"
            >
              <ProcessingSpinner className="w-12 h-12 sm:w-14 sm:h-14 text-primary" />
            </div>
          )}

          {isRecorded && (
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-success flex items-center justify-center"
              aria-hidden
            >
              <CheckIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
            </div>
          )}
        </div>

        {/* Status text & timer */}
        <div className="text-center space-y-1 min-h-[3rem]">
          <p className="text-2xl font-mono font-semibold text-foreground tabular-nums">
            {isRecording && formatDuration(state.duration)}
            {isRecorded && formatDuration(state.duration)}
            {isIdle && "00:00"}
            {isProcessing && "00:00"}
          </p>
          <p className="text-sm text-muted">
            {isIdle && "Tap to start recording"}
            {isRecording && "Listening… capturing details"}
            {isProcessing && "Processing…"}
            {isRecorded && "Recording captured"}
          </p>
        </div>
      </div>

      {/* Audio preview (recorded state) */}
      {isRecorded && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 rounded-lg bg-muted-bg">
            <audio
              ref={(el) => {
                audioRef.current = el;
                if (el && !objectUrlRef.current) {
                  objectUrlRef.current = URL.createObjectURL(state.blob);
                  el.src = objectUrlRef.current;
                }
              }}
              controls
              className="flex-1 h-10 min-w-0 w-full"
              preload="metadata"
            />
            <button
              onClick={reset}
              className="shrink-0 text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Record again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function ProcessingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
