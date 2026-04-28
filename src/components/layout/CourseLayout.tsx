"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProgress } from "@/contexts/ProgressContext";

const MODULES = [
  { id: "01", title: "VPC Deep Dive", slug: "vpc-deep-dive" },
  { id: "02", title: "Hybrid Connectivity", slug: "hybrid-connectivity" },
  { id: "03", title: "Transit & PrivateLink", slug: "transit-and-privatelink" },
  { id: "04", title: "DNS & Route 53", slug: "dns-and-route53" },
  { id: "05", title: "Load Balancing & CDN", slug: "load-balancing-and-cdn" },
  { id: "06", title: "Network Security", slug: "network-security" },
  { id: "07", title: "Monitoring", slug: "monitoring-and-troubleshooting" },
  { id: "08", title: "Automation", slug: "network-automation" },
  { id: "09", title: "Multi-Account Arch", slug: "multi-account-architecture" },
  { id: "10", title: "BGP & Exam Mastery", slug: "bgp-and-exam-mastery" },
];

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/learn", label: "My Path", icon: "◈" },
  { href: "/labs", label: "Labs", icon: "⬡" },
  { href: "/cheatsheets", label: "Cheatsheets", icon: "◫" },
  { href: "/about", label: "About", icon: "◉" },
];

export function CourseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tracker, persona } = useProgress();

  const totalCompleted = new Set(tracker.completionEvents.map(e => e.moduleId)).size;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-border">
          <Link href="/" className="block">
            <p className="text-[10px] text-primary font-mono font-bold uppercase tracking-widest">AWS</p>
            <p className="text-sm font-bold text-foreground leading-tight">Advanced Networking</p>
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 rounded px-2 py-0.5 font-mono uppercase tracking-wider">
              {persona}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">{totalCompleted}/10</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-2 py-3 border-b border-border">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === l.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
              <span className="text-base w-4">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Module list */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <p className="px-3 mb-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Modules</p>
          {MODULES.map(m => {
            const completed = tracker.completionEvents.some(e => e.moduleId === m.id);
            const active = pathname.includes(m.slug);
            return (
              <Link key={m.id} href={`/modules/${m.slug}`}
                className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors group",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                <span className={cn("text-[10px] font-mono font-bold w-5 shrink-0",
                  completed ? "text-emerald-400" : active ? "text-primary" : "text-muted-foreground")}>
                  {completed ? "✓" : m.id}
                </span>
                <span className="text-xs leading-snug truncate">{m.title}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-mono">ANS-C01 · Phase 1</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex-1">
          {children}
        </div>

        {/* Persistent footer */}
        <footer className="border-t border-border/50 px-6 py-3 bg-card/30 shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[11px] text-muted-foreground font-mono">
              AWS Advanced Networking Course · Created by{" "}
              <a
                href="https://www.linkedin.com/in/mondweepchakravorty/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Mondweep Chakravorty
              </a>
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/in/mondweepchakravorty/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a
                href="https://github.com/mondweep/vibe-cast/tree/aws-advanced-networking"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                GitHub
              </a>
              <Link
                href="/privacy"
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
