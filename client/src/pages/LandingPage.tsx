import {
  ArrowRight,
  Mountain,
  Calendar,
  BarChart3,
  Share,
  Download,
  Sparkles,
  FileSpreadsheet,
  Snowflake,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import PageMeta from "@/components/PageMeta";

const problemPoints = [
  "Forgetting which days you skied last season",
  "No easy way to track your gear usage",
  "Scattered notes across apps and photos",
  "Missing out on seeing your progress",
];

const features = [
  {
    icon: Calendar,
    title: "Log Every Day",
    description: "Quick entries with photos, conditions, and gear. Takes seconds.",
  },
  {
    icon: BarChart3,
    title: "See Your Stats",
    description: "Total days, resorts visited, gear breakdown, and more.",
  },
  {
    icon: Share,
    title: "Share Your Season",
    description: "Beautiful share links to show off your adventures.",
  },
  {
    icon: Download,
    title: "Own Your Data",
    description: "Import from photos. Export to CSV. No lock-in.",
  },
  {
    icon: FileSpreadsheet,
    title: "Google Sheets Sync",
    description: "Automatic sync to Google Sheets. Your days, always up to date.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const goToAuth = (mode: "login" | "signup" = "login") => {
    navigate(`/auth?mode=${mode}`);
  };

  return (
    <>
      <PageMeta
        title="Shred Day"
        description="Log your ski days and photos."
      />
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
        <header className="sticky top-0 z-10 backdrop-blur-sm bg-white/80 border-b border-slate-200/70">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <Logo className="text-xl" />
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => goToAuth("login")} className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
              <Button onClick={() => goToAuth("signup")} className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </div>
          </div>
        </header>

      <main>
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 lg:pt-28">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
              {/* Left Content */}
              <div className="space-y-8 text-left flex-1">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                  <span className="text-foreground">Remember</span>
                  <br />
                  <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    every shred.day
                  </span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground max-w-xl leading-relaxed">
                  The simplest way to track your ski or snowboard season. Log days, see stats, and never forget another epic run.
                </p>

                <div className="flex flex-row flex-nowrap gap-3 pt-2">
                  <Button
                    onClick={() => goToAuth("signup")}
                    size="lg"
                    className="h-12 px-6 text-base sm:h-14 sm:px-8 sm:text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 shrink-0 whitespace-nowrap"
                  >
                    Start Tracking Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToAuth("login")}
                    size="lg"
                    className="h-12 px-6 text-base sm:h-14 sm:px-8 sm:text-lg border-2 shrink-0 whitespace-nowrap"
                  >
                    I have an account
                  </Button>
                </div>
              </div>

              {/* Right - Phone Mockup */}
              <div className="relative flex justify-center items-center mt-12 lg:mt-0 flex-shrink-0 translate-x-4 md:-translate-x-12 lg:-translate-x-16">
                <div className="absolute z-0 w-52 md:w-60 -left-6 md:-left-4 lg:-left-24 xl:-left-28 top-6 md:top-10 -rotate-[4deg]">
                  <div className="bg-card rounded-[2rem] border-4 border-foreground/10 shadow-2xl shadow-primary/20 overflow-hidden">
                    <div className="bg-foreground/10 h-5 flex items-center justify-center">
                      <div className="w-16 h-3 bg-foreground/20 rounded-full" />
                    </div>
                    <img
                      src="/landing/shred-day-stats.png"
                      alt="Shred.day web-app showing season stats"
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                    <div className="h-5 bg-foreground/10 flex items-center justify-center">
                      <div className="w-16 h-1 bg-foreground/30 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 w-56 md:w-64 rotate-[10deg]">
                  <div className="bg-card rounded-[2rem] border-4 border-foreground/10 shadow-2xl shadow-primary/20 overflow-hidden">
                    <div className="bg-foreground/10 h-5 flex items-center justify-center">
                      <div className="w-16 h-3 bg-foreground/20 rounded-full" />
                    </div>
                    <img
                      src="/landing/app-screenshot.png"
                      alt="Shred.day web-app showing ski day activities"
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                    <div className="h-5 bg-foreground/10 flex items-center justify-center">
                      <div className="w-16 h-1 bg-foreground/30 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Problem Statements */}
        <section className="py-16 px-6 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Sound familiar?</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {problemPoints.map((problem) => (
                <div
                  key={problem}
                  className="flex items-start gap-3 p-5 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive">
                    <XCircle className="w-4 h-4" />
                  </span>
                  <p className="text-base md:text-lg text-foreground">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">One app. Several seasons. All your days.</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Built for skiers and snowboarders who want to remember every day on the mountain.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Highlight */}
        <section className="py-16 px-6 bg-gradient-to-b from-white to-slate-50">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-white rounded-3xl border border-border shadow-2xl shadow-primary/10 overflow-hidden">
              <div className="border-b border-border px-6 py-3 bg-slate-50 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="grid md:grid-cols-3 gap-6 p-8">
                <div className="bg-muted/50 rounded-xl p-6 text-center">
                  <Mountain className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-4xl font-bold text-foreground">47</div>
                  <div className="text-sm text-muted-foreground">Days This Season</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-6 text-center">
                  <Snowflake className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-4xl font-bold text-foreground">5</div>
                  <div className="text-sm text-muted-foreground">Skis Used</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-6 text-center">
                  <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="text-4xl font-bold text-foreground">12</div>
                  <div className="text-sm text-muted-foreground">Resorts Visited</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-6">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Ready to track your season?</h2>
            <p className="text-xl text-muted-foreground mb-10">
              Free to use. No credit card required. Your data, always.
            </p>
            <Button
              onClick={() => goToAuth("signup")}
              size="lg"
              className="h-16 px-12 text-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo className="text-lg" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} shred.day — Track your season.</p>
        </div>
      </footer>
      </div>
    </>
  );
}
