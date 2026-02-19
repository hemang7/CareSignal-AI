import { Button, Card } from "@/components";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 min-w-0 w-full overflow-x-hidden safe-mobile">
      {/* Hero */}
      <section className="text-center space-y-6 sm:space-y-8 mb-16 sm:mb-20">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight px-2">
          CareSignal{" "}
          <span className="text-primary">AI</span>
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto px-1">
          Compassionate AI support for caregivers. Get guidance, reminders, and
          peace of mind—all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center px-2">
          <Button href="/dashboard" size="lg" className="w-full sm:w-auto">
            Get Started
          </Button>
          <Button href="/ai-insights" variant="outline" size="lg" className="w-full sm:w-auto">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-primary-muted flex items-center justify-center text-primary font-semibold">
            1
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Care Guidance
          </h3>
          <p className="text-muted text-sm sm:text-base">
            Clear, actionable support for daily care tasks and health management.
          </p>
        </Card>
        <Card className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-secondary-muted flex items-center justify-center text-secondary font-semibold">
            2
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Smart Reminders
          </h3>
          <p className="text-muted text-sm sm:text-base">
            Medication schedules and appointment reminders you can rely on.
          </p>
        </Card>
        <Card className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center text-accent font-semibold">
            3
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Emotional Support
          </h3>
          <p className="text-muted text-sm sm:text-base">
            A compassionate companion when you need to talk or process.
          </p>
        </Card>
      </section>
    </div>
  );
}
