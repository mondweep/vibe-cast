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
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
