import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleDomain } from "@/types";

const MODULES: { id: string; title: string; domain: ModuleDomain; hours: number; slug: string }[] = [
  { id: "01", title: "VPC Deep Dive", domain: "design", hours: 6, slug: "vpc-deep-dive" },
  { id: "02", title: "Hybrid Connectivity", domain: "design", hours: 8, slug: "hybrid-connectivity" },
  { id: "03", title: "Transit & PrivateLink", domain: "design", hours: 5, slug: "transit-and-privatelink" },
  { id: "04", title: "DNS & Route 53", domain: "operations", hours: 5, slug: "dns-and-route53" },
  { id: "05", title: "Load Balancing & CDN", domain: "design", hours: 6, slug: "load-balancing-and-cdn" },
  { id: "06", title: "Network Security", domain: "security", hours: 7, slug: "network-security" },
  { id: "07", title: "Monitoring & Troubleshooting", domain: "operations", hours: 5, slug: "monitoring-and-troubleshooting" },
  { id: "08", title: "Network Automation", domain: "automation", hours: 6, slug: "network-automation" },
  { id: "09", title: "Multi-Account Architecture", domain: "design", hours: 7, slug: "multi-account-architecture" },
  { id: "10", title: "BGP & Exam Mastery", domain: "exam-prep", hours: 6, slug: "bgp-and-exam-mastery" },
];

const STATS = [
  { value: "10", label: "Modules" },
  { value: "61h", label: "Content" },
  { value: "3", label: "Personas" },
  { value: "ANS-C01", label: "Aligned" },
];

const domainVariantMap: Record<ModuleDomain, "design" | "operations" | "security" | "automation" | "exam-prep"> = {
  design: "design",
  operations: "operations",
  security: "security",
  automation: "automation",
  "exam-prep": "exam-prep",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-card to-background px-6 py-20 text-center">
        <Badge variant="aws" className="mb-6 text-xs tracking-widest uppercase">
          AWS Advanced Networking
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
          Master AWS Networking.<br />
          <span className="text-primary">End to end.</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-base leading-relaxed">
          A comprehensive, interactive course for students, teachers, and practitioners.
          Journey from VPC fundamentals to BGP mastery — ready for ANS-C01 and real-world projects.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/learn">
            <Button size="lg" className="font-mono">Start Learning →</Button>
          </Link>
          <Link href="/modules">
            <Button variant="outline" size="lg" className="font-mono">Browse Modules</Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border px-6 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-primary font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Module Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-xl font-bold text-foreground mb-2">Course Modules</h2>
        <p className="text-muted-foreground text-sm mb-8">10 modules · ANS-C01 domain coverage</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <Link key={m.id} href={`/modules/${m.slug}`} className="block group">
              <div className="rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-card/80">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs text-primary font-bold">M{m.id}</span>
                    <h3 className="font-semibold text-sm text-foreground mt-0.5">{m.title}</h3>
                  </div>
                  <Badge variant={domainVariantMap[m.domain]}>{m.domain}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{m.hours}h</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground font-mono">
          AWS Advanced Networking Course · Built with Next.js, shadcn/ui, Tailwind ·{" "}
          <a
            href="https://linear.app/mondweep/project/aws-advanced-networking-course-82c5d59087e7"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tracked in Linear ↗
          </a>
        </p>
      </footer>
    </main>
  );
}
