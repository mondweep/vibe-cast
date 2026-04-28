import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheatsheetGallery, type Cheatsheet } from "@/components/course/cheatsheet-gallery";
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

const CHEATSHEETS: Cheatsheet[] = [
  { id: "overview", title: "Advanced Networking Overview", image: "/images/cheatsheets/advanced-networking-overview.png" },
  { id: "roadmap", title: "Curriculum Roadmap", image: "/images/cheatsheets/curriculum-roadmap.png" },
  { id: "m01", title: "VPC Deep Dive", image: "/images/cheatsheets/M01/M01-vpc-deep-dive-cheatsheet.png", moduleSlug: "vpc-deep-dive", moduleLabel: "M01" },
  { id: "m02", title: "Hybrid Connectivity", image: "/images/cheatsheets/M02/M02-hybrid-connectivity-cheatsheet.png", moduleSlug: "hybrid-connectivity", moduleLabel: "M02" },
  { id: "m03", title: "Transit & PrivateLink", image: "/images/cheatsheets/M03/M03-transit-and-privatelink-cheatsheet.png", moduleSlug: "transit-and-privatelink", moduleLabel: "M03" },
  { id: "m04", title: "Route 53 & DNS Mastery", image: "/images/cheatsheets/M04/M04-dns-and-route53-cheatsheet.png", moduleSlug: "dns-and-route53", moduleLabel: "M04" },
  { id: "m05", title: "Load Balancing & CDN", image: "/images/cheatsheets/M05/M05-load-balancing-and-cdn-cheatsheet.png", moduleSlug: "load-balancing-and-cdn", moduleLabel: "M05" },
  { id: "m06", title: "Network Security", image: "/images/cheatsheets/M06/M06-network-security-cheatsheet.png", moduleSlug: "network-security", moduleLabel: "M06" },
  { id: "m07", title: "Monitoring & Troubleshooting", image: "/images/cheatsheets/M07/M07-monitoring-and-troubleshooting-cheatsheet.png", moduleSlug: "monitoring-and-troubleshooting", moduleLabel: "M07" },
  { id: "m08", title: "Network Automation & Compliance", image: "/images/cheatsheets/M08/M08-network-automation-cheatsheet.png", moduleSlug: "network-automation", moduleLabel: "M08" },
  { id: "m09", title: "Multi-Account Networking", image: "/images/cheatsheets/M09/M09-multi-account-architecture-cheatsheet.png", moduleSlug: "multi-account-architecture", moduleLabel: "M09" },
  { id: "m10", title: "BGP Deep Dive & Exam Mastery", image: "/images/cheatsheets/M10/M10-bgp-and-exam-mastery-cheatsheet.png", moduleSlug: "bgp-and-exam-mastery", moduleLabel: "M10" },
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

      {/* Cheatsheets */}
      <section className="border-t border-border bg-card/30 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-foreground mb-2">Cheatsheets</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Visual references for each module · click to expand · ← → to navigate
          </p>
          <CheatsheetGallery cheatsheets={CHEATSHEETS} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs text-muted-foreground font-mono">
              Created by{" "}
              <a
                href="https://www.linkedin.com/in/mondweepchakravorty/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Mondweep Chakravorty
              </a>
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              AWS Advanced Networking Course · Built with Next.js, shadcn/ui, Tailwind
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/mondweepchakravorty/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
            <a
              href="https://github.com/mondweep/vibe-cast/tree/aws-advanced-networking"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              GitHub
            </a>
            <a
              href="https://linear.app/mondweep/project/aws-advanced-networking-course-82c5d59087e7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              Linear ↗
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
