import { Button, Card } from "@/components";

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function LiveAIOutputPreview() {
  return (
    <div className="mt-12 sm:mt-16 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto text-left">
      {/* Card 1 — Risk Detection */}
      <div
        className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-lg text-left"
        style={{
          boxShadow: "0 0 0 1px rgba(99,102,241,0.08)",
        }}
      >
        <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
          Real-time Risk Detection
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 items-start">
            <span className="text-lg shrink-0 mt-0.5" aria-hidden>⚠</span>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  Fall Risk
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md shrink-0 bg-red-500/25 text-red-700 dark:text-red-300 border border-red-500/40">
                  High
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                Patient reported dizziness and required wall support while
                standing.
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-lg shrink-0 mt-0.5" aria-hidden>⚡</span>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  Medication Concern
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md shrink-0 bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                  Medium
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                Missed blood thinner dose yesterday.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 — EMR Export Preview */}
      <div
        className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-lg text-left"
        style={{
          boxShadow: "0 0 0 1px rgba(99,102,241,0.08)",
        }}
      >
        <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
          EMR-Ready Clinical Summary
        </h3>
        <pre className="text-xs sm:text-sm font-mono text-foreground/90 bg-muted-bg/50 rounded-lg p-4 overflow-x-auto border border-border">
          {`ASSESSMENT
Patient exhibited dizziness and confusion
with elevated blood pressure.

PLAN
- Notify supervising nurse today
- Monitor over next 24 hours
- Review medication adherence`}
        </pre>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 min-w-0 w-full overflow-x-hidden safe-mobile">
      {/* Hero */}
      <section className="relative text-center pt-16 sm:pt-20 lg:pt-24 pb-20 sm:pb-24">
        <div
          className="absolute inset-0 pointer-events-none -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 80%)",
          }}
        />

        <div className="animate-fade-in-up opacity-0">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight max-w-4xl mx-auto leading-tight">
            AI that turns caregiver notes into{" "}
            <span className="text-primary">clinical intelligence</span>.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted max-w-2xl mx-auto">
            Convert voice notes into structured insights, real-time risk
            detection, and EMR-ready summaries in seconds.
          </p>
          <p className="mt-4 text-sm text-muted/90 max-w-xl mx-auto">
            Caregiver observations often contain life-critical signals that never
            get structured. CareSignal AI makes them actionable.
          </p>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up opacity-0 [animation-delay:100ms]">
          <Button
            href="/record"
            size="lg"
            className="w-full sm:w-auto rounded-xl hover:scale-105 transition-transform duration-200 hover:shadow-lg hover:shadow-primary/20 min-h-[44px]"
          >
            Try the Demo
          </Button>
          <Button
            href="/insights"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto rounded-xl hover:scale-105 transition-transform duration-200 hover:shadow-lg hover:shadow-primary/10 min-h-[44px]"
          >
            View Sample Insights
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted/80">
          No login required • Runs locally • Built for real caregiver workflows
        </p>

        <div className="animate-fade-in-up opacity-0 [animation-delay:200ms] text-left">
          <LiveAIOutputPreview />
        </div>
      </section>

      {/* Trust Strip */}
      <section className="py-8 border-y border-border">
        <p className="text-center text-xs sm:text-sm text-muted mb-4">
          Built as a real-world AI clinical intelligence system
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Multi-stage LLM pipeline",
            "Longitudinal patient insights",
            "Explainable AI outputs",
            "EMR-ready exports",
          ].map((label) => (
            <span
              key={label}
              className="px-3 py-1 rounded-full text-xs font-medium bg-muted-bg text-muted border border-border"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Live Output Preview */}
      <section className="py-20 lg:py-28 text-left">
        <h2 className="text-2xl font-semibold text-foreground text-center mb-12">
          Real AI Outputs
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left">
            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
              EMR Export Example
            </h3>
            <pre className="text-xs sm:text-sm font-mono text-foreground/90 bg-muted-bg/50 rounded-lg p-4 overflow-x-auto border border-border">
              {`ASSESSMENT
Patient exhibited dizziness and unsteadiness
during transfer. BP 128/82. Took morning
medications without issues.

PLAN
Notify supervising nurse of dizziness.
Monitor mobility with walker.`}
            </pre>
          </Card>
          <Card className="rounded-xl border border-border bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left">
            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
              Risk Detection Example
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 items-start">
                <span className="text-lg shrink-0 mt-0.5" aria-hidden>⚠</span>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Fall risk</span>
                    <span className="text-xs px-2 py-0.5 rounded-md shrink-0 bg-red-500/25 text-red-700 dark:text-red-300 border border-red-500/40">
                      High
                    </span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">
                    Dizziness and unsteadiness during transfer
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-lg shrink-0 mt-0.5" aria-hidden>⚡</span>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Medication concern</span>
                    <span className="text-xs px-2 py-0.5 rounded-md shrink-0 bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                      Medium
                    </span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">
                    Timing and adherence monitoring
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-lg shrink-0 mt-0.5" aria-hidden>⚡</span>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Possible deterioration</span>
                    <span className="text-xs px-2 py-0.5 rounded-md shrink-0 bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                      Medium
                    </span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">
                    Fatigue noted; trend vs prior visit
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Credibility — Built for real caregiver workflows */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-transparent to-white/5 dark:to-white/[0.02] text-left">
        <h2 className="text-2xl font-semibold text-foreground text-center mb-3">
          Built for real caregiver workflows
        </h2>
        <p className="text-muted text-center text-sm sm:text-base max-w-xl mx-auto mb-12">
          Designed to surface clinical risks early and reduce documentation burden.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-xl border border-white/10 dark:border-border bg-white/5 dark:bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left">
            <h3 className="text-base font-semibold text-foreground mb-2">
              Real-time risk detection
            </h3>
            <p className="text-muted text-sm">
              Detect fall risk, medication issues, and deterioration signals instantly from caregiver notes.
            </p>
          </Card>
          <Card className="rounded-xl border border-white/10 dark:border-border bg-white/5 dark:bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left">
            <h3 className="text-base font-semibold text-foreground mb-2">
              EMR-ready summaries
            </h3>
            <p className="text-muted text-sm">
              Export structured, clinician-friendly reports formatted for real documentation workflows.
            </p>
          </Card>
          <Card className="rounded-xl border border-white/10 dark:border-border bg-white/5 dark:bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left">
            <h3 className="text-base font-semibold text-foreground mb-2">
              Privacy-first processing
            </h3>
            <p className="text-muted text-sm">
              No patient login required. Built with local-first workflows and secure API handling.
            </p>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 lg:py-32">
        <h2 className="text-2xl font-semibold text-foreground text-center mb-16">
          How it works
        </h2>
        <div className="flex flex-col md:flex-row md:items-stretch gap-12 md:gap-4">
          {/* Step 1 */}
          <div className="flex-1 flex flex-col items-center text-center group">
            <div
              className="relative inline-flex w-14 h-14 rounded-xl items-center justify-center mb-6 transition-all duration-200 group-hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
                boxShadow: "0 0 0 1px rgba(99,102,241,0.1)",
              }}
            >
              <MicrophoneIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              Capture caregiver observations
            </h3>
            <p className="text-muted text-sm max-w-[200px]">
              Voice or typed visit summaries.
            </p>
          </div>

          {/* Connector line — desktop */}
          <div className="hidden md:flex flex-1 items-center justify-center shrink-0 max-w-8">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden />
          </div>

          {/* Step 2 */}
          <div className="flex-1 flex flex-col items-center text-center group">
            <div
              className="relative inline-flex w-14 h-14 rounded-xl items-center justify-center mb-6 transition-all duration-200 group-hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
                boxShadow: "0 0 0 1px rgba(99,102,241,0.1)",
              }}
            >
              <LightningIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              AI extracts clinical intelligence
            </h3>
            <p className="text-muted text-sm max-w-[200px]">
              Risk detection, summaries, structured observations.
            </p>
          </div>

          {/* Connector line — desktop */}
          <div className="hidden md:flex flex-1 items-center justify-center shrink-0 max-w-8">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden />
          </div>

          {/* Step 3 */}
          <div className="flex-1 flex flex-col items-center text-center group">
            <div
              className="relative inline-flex w-14 h-14 rounded-xl items-center justify-center mb-6 transition-all duration-200 group-hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
                boxShadow: "0 0 0 1px rgba(99,102,241,0.1)",
              }}
            >
              <DocumentIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              Generate EMR-ready insights
            </h3>
            <p className="text-muted text-sm max-w-[200px]">
              EMR-ready summaries and follow-up actions.
            </p>
          </div>
        </div>
      </section>

      {/* Why This Exists */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-transparent to-white/5 dark:to-white/[0.02]">
        <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
          Why CareSignal AI Exists
        </h2>
        <p className="text-muted text-center max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
          Caregiver observations often contain critical health signals, but most
          are lost in unstructured notes. CareSignal AI was built to transform
          those observations into structured, actionable intelligence that
          supports safer, faster care decisions.
        </p>
      </section>

      {/* Tech Credibility */}
      <section className="py-20 lg:py-28">
        <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
          Built as a real AI system
        </h2>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {[
            "Next.js + TypeScript",
            "Structured LLM outputs",
            "Multi-stage AI pipeline",
            "Longitudinal patient modeling",
            "Explainable AI reasoning",
          ].map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-muted-bg/80 text-foreground/90 border border-border"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
