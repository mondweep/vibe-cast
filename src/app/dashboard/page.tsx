"use client";
import Link from "next/link";
import { useProgress } from "@/contexts/ProgressContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MODULES = [
  { id: "01", title: "VPC Deep Dive", slug: "vpc-deep-dive", domain: "design" as const, hours: 6, lessons: 5 },
  { id: "02", title: "Hybrid Connectivity", slug: "hybrid-connectivity", domain: "design" as const, hours: 8, lessons: 6 },
  { id: "03", title: "Transit & PrivateLink", slug: "transit-and-privatelink", domain: "design" as const, hours: 5, lessons: 4 },
  { id: "04", title: "DNS & Route 53", slug: "dns-and-route53", domain: "operations" as const, hours: 5, lessons: 4 },
  { id: "05", title: "Load Balancing & CDN", slug: "load-balancing-and-cdn", domain: "design" as const, hours: 6, lessons: 5 },
  { id: "06", title: "Network Security", slug: "network-security", domain: "security" as const, hours: 7, lessons: 5 },
  { id: "07", title: "Monitoring & Troubleshooting", slug: "monitoring-and-troubleshooting", domain: "operations" as const, hours: 5, lessons: 4 },
  { id: "08", title: "Network Automation", slug: "network-automation", domain: "automation" as const, hours: 6, lessons: 4 },
  { id: "09", title: "Multi-Account Architecture", slug: "multi-account-architecture", domain: "design" as const, hours: 7, lessons: 5 },
  { id: "10", title: "BGP & Exam Mastery", slug: "bgp-and-exam-mastery", domain: "exam-prep" as const, hours: 6, lessons: 5 },
];

const PERSONA_PATHS: Record<string, string[]> = {
  student:      ["01","02","03","04","05","06","07","08","09","10"],
  teacher:      ["01","02","03","04","05","06","07","08","09","10"],
  practitioner: ["01","03","06","07","08","09","02","04","05","10"],
};

const PERSONA_GREETINGS: Record<string, { title: string; sub: string }> = {
  student:      { title: "Your certification path", sub: "Follow the structured path to ANS-C01 readiness." },
  teacher:      { title: "Facilitator dashboard", sub: "Full module access + teaching notes in each lesson." },
  practitioner: { title: "Your engineering track", sub: "Jump to what you need — non-linear access unlocked." },
};

type DomainVariant = "design" | "operations" | "security" | "automation" | "exam-prep";

export default function DashboardPage() {
  const { tracker, persona, resetProgress } = useProgress();

  const totalMinutes = tracker.totalMinutesSpent;
  const completedModules = new Set(tracker.completionEvents.map(e => e.moduleId)).size;
  const overallPct = Math.round((completedModules / 10) * 100);
  const path = PERSONA_PATHS[persona] ?? PERSONA_PATHS.student;
  const greeting = PERSONA_GREETINGS[persona];

  const orderedModules = path.map(id => MODULES.find(m => m.id === id)!).filter(Boolean);

  // Find first incomplete for "continue" CTA
  const nextModule = orderedModules.find(m => {
    const completed = tracker.completionEvents.filter(e => e.moduleId === m.id).length;
    return completed < m.lessons;
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{greeting.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{greeting.sub}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Overall progress", value: `${overallPct}%`, sub: `${completedModules} of 10 modules` },
          { label: "Time spent", value: totalMinutes >= 60 ? `${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m` : `${totalMinutes}m`, sub: "learning time" },
          { label: "Modules done", value: String(completedModules), sub: "of 10 total" },
          { label: "Avg score", value: Object.values(tracker.moduleScores).length
              ? `${Math.round(Object.values(tracker.moduleScores).reduce((a,b)=>a+b,0)/Object.values(tracker.moduleScores).length)}%`
              : "—", sub: "quiz average" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-primary font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Overall bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Course completion</span><span>{overallPct}%</span>
        </div>
        <Progress value={overallPct} className="h-2" />
      </div>

      {/* Continue CTA */}
      {nextModule && (
        <div className="mb-8 rounded-lg border border-primary/30 bg-primary/5 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-primary font-mono font-bold uppercase tracking-wider mb-1">Continue where you left off</p>
            <p className="font-semibold text-foreground">M{nextModule.id} — {nextModule.title}</p>
          </div>
          <Link href={`/modules/${nextModule.slug}`}>
            <Button className="font-mono shrink-0">Continue →</Button>
          </Link>
        </div>
      )}

      {/* Module grid */}
      <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">
        {persona === "practitioner" ? "Recommended order for your track" : "Module path"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {orderedModules.map((m, idx) => {
          const done = tracker.completionEvents.filter(e => e.moduleId === m.id).length;
          const pct = Math.round((done / m.lessons) * 100);
          const score = tracker.moduleScores[m.id];
          return (
            <Link key={m.id} href={`/modules/${m.slug}`}>
              <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-5">{idx+1}</span>
                    <div>
                      <span className="text-[10px] font-mono text-primary font-bold">M{m.id}</span>
                      <p className="text-sm font-semibold text-foreground leading-tight">{m.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {score !== undefined && (
                      <span className="text-[10px] font-mono text-emerald-400">{score}%</span>
                    )}
                    <Badge variant={m.domain as DomainVariant}>{m.domain}</Badge>
                  </div>
                </div>
                <Progress value={pct} className="h-1 mb-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{done}/{m.lessons} lessons</span>
                  <span>{m.hours}h · {pct}%</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-border flex justify-end">
        <button onClick={resetProgress}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors font-mono">
          Reset all progress
        </button>
      </div>
    </div>
  );
}
