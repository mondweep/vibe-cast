import { CourseLayout } from "@/components/layout/CourseLayout";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const FEATURES = [
  {
    icon: "◈",
    title: "Persona-Adaptive Learning",
    desc: "Choose your role on entry — Student, Teacher, or Practitioner. The module order, content depth, and supplementary resources adapt to your path.",
  },
  {
    icon: "▦",
    title: "10 In-Depth Modules",
    desc: "61 hours of content spanning every ANS-C01 domain: VPC, Hybrid Connectivity, Transit Gateway, DNS, Load Balancing, Security, Monitoring, Automation, Multi-Account Architecture, and BGP.",
  },
  {
    icon: "⬡",
    title: "Interactive Labs",
    desc: "Three hands-on simulators: a VPC Builder (design and validate architectures), a BGP Path Simulator (predict routing decisions), and Scenario Exercises (real-world architecture choices with explanations).",
  },
  {
    icon: "◫",
    title: "Visual Cheatsheets",
    desc: "12 quick-reference cheatsheets — one per module plus two overview sheets. View full-screen, navigate with arrow keys, and download as PNG.",
  },
  {
    icon: "◎",
    title: "AI Tutor (GraphRAG)",
    desc: "Ask any AWS networking question and get answers grounded in the course content. Uses a knowledge graph of 67 nodes and 69 typed edges combined with vector similarity search across all 10 modules.",
  },
  {
    icon: "◇",
    title: "Progress Tracking",
    desc: "Your module progress, quiz scores, and time spent persist across sessions via local storage. The dashboard shows your completion percentage, average score, and a personalised continue CTA.",
  },
];

const MODULES = [
  { id: "01", title: "VPC Deep Dive",               slug: "vpc-deep-dive",                domain: "design" as const },
  { id: "02", title: "Hybrid Connectivity",          slug: "hybrid-connectivity",           domain: "design" as const },
  { id: "03", title: "Transit & PrivateLink",        slug: "transit-and-privatelink",       domain: "design" as const },
  { id: "04", title: "DNS & Route 53",               slug: "dns-and-route53",               domain: "operations" as const },
  { id: "05", title: "Load Balancing & CDN",         slug: "load-balancing-and-cdn",        domain: "design" as const },
  { id: "06", title: "Network Security",             slug: "network-security",              domain: "security" as const },
  { id: "07", title: "Monitoring & Troubleshooting", slug: "monitoring-and-troubleshooting",domain: "operations" as const },
  { id: "08", title: "Network Automation",           slug: "network-automation",            domain: "automation" as const },
  { id: "09", title: "Multi-Account Architecture",   slug: "multi-account-architecture",    domain: "design" as const },
  { id: "10", title: "BGP & Exam Mastery",           slug: "bgp-and-exam-mastery",          domain: "exam-prep" as const },
];

type DomainVariant = "design" | "operations" | "security" | "automation" | "exam-prep";

export default function AboutPage() {
  return (
    <CourseLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="mb-12">
          <Badge variant="aws" className="mb-4 text-xs tracking-widest uppercase">AWS Advanced Networking</Badge>
          <h1 className="text-3xl font-bold text-foreground mb-4 leading-tight">
            About this course
          </h1>
          <p className="text-muted-foreground leading-7">
            This is a comprehensive, interactive learning platform for <strong className="text-foreground">AWS Advanced Networking</strong> —
            designed to take students, teachers, and cloud practitioners from foundational VPC knowledge to
            confident, real-world AWS networking expertise and <strong className="text-foreground">ANS-C01 certification readiness</strong>.
          </p>
          <p className="text-muted-foreground leading-7 mt-3">
            Every module is built around the principle that understanding <em>why</em> a service works the way it does
            is more valuable than memorising configuration steps. The content is practitioner-grade — the same depth
            you need to architect production networks, not just pass an exam.
          </p>
        </div>

        <hr className="border-border mb-12" />

        {/* How to use */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-6">How to use this course</h2>

          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Choose your persona",
                body: "Start at /learn and select your role. Students follow a structured path from fundamentals to exam prep. Practitioners can jump directly to any module. Teachers get full access plus facilitator context throughout.",
              },
              {
                step: "2",
                title: "Work through the modules",
                body: "Each module opens in the sidebar. Read the content, study the comparison tables, and note the ANS-C01 exam tips highlighted in orange blockquotes. Mark lessons complete as you go — your progress is saved automatically.",
              },
              {
                step: "3",
                title: "Reinforce with labs",
                body: "After reading a module, open the Labs tab and try the corresponding simulator. The VPC Builder validates your architecture designs. The BGP Simulator lets you adjust path attributes and see which route wins. Scenario Exercises test real decision-making.",
              },
              {
                step: "4",
                title: "Reference the cheatsheets",
                body: "Each module has a visual cheatsheet distilling the key concepts, comparison tables, and exam traps onto one page. Use them for quick revision or as a study aid before the exam.",
              },
              {
                step: "5",
                title: "Ask the AI Tutor",
                body: "The ◈ Ask AI Tutor button is available on every page. Ask anything — concept explanations, architecture trade-offs, troubleshooting approaches, or exam strategy. It retrieves the most relevant course content and knowledge graph context before answering.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-5">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary font-mono font-bold text-sm">{step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border mb-12" />

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-primary text-lg">{f.icon}</span>
                  <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border mb-12" />

        {/* Course scope */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-2">Course scope</h2>
          <p className="text-muted-foreground text-sm mb-6">
            10 modules · 61 hours · ANS-C01 aligned · covers all four exam domains
          </p>
          <div className="space-y-2">
            {MODULES.map(m => (
              <Link key={m.id} href={`/modules/${m.slug ?? m.title.toLowerCase().replace(/\s+/g, "-").replace(/[&]/g, "and")}`}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-all">
                  <span className="font-mono text-xs text-primary font-bold w-8">M{m.id}</span>
                  <span className="text-sm text-foreground flex-1">{m.title}</span>
                  <Badge variant={m.domain as DomainVariant}>{m.domain}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <hr className="border-border mb-12" />

        {/* Tech stack */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-6">Built with</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Next.js 14", "TypeScript", "Tailwind CSS", "shadcn/ui",
              "MDX", "Supabase + pgvector", "Voyage AI", "Claude API",
              "Vercel", "React Flow", "remark-gfm",
            ].map(t => (
              <span key={t} className="bg-muted border border-border rounded px-3 py-1 text-xs font-mono text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          <p className="text-muted-foreground text-xs mt-4 leading-relaxed">
            Engineered using <strong className="text-foreground">Domain-Driven Design</strong> (4 bounded contexts),{" "}
            <strong className="text-foreground">London School TDD</strong> (outside-in, Playwright + Jest), and{" "}
            <strong className="text-foreground">Architecture Decision Records</strong> (ADR-001 to ADR-007).
            The AI Tutor uses a <strong className="text-foreground">GraphRAG</strong> pipeline — hybrid retrieval
            combining vector similarity search with typed knowledge graph traversal.
          </p>
        </section>

        <hr className="border-border mb-12" />

        {/* Credit */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-6">About the author</h2>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 font-bold text-primary text-lg">
                M
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg">Mondweep Chakravorty</h3>
                <p className="text-primary text-sm font-mono mb-3">
                  Senior Programme Manager · Brigade Electronics PLC
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  AWS networking practitioner and co-lead of the{" "}
                  <strong className="text-foreground">Agentics Foundation London Chapter</strong> — a community
                  focused on agentic AI and automation. This course was designed and built to upskill students,
                  teachers, and practitioners alike, drawing on real-world programme delivery experience across
                  complex cloud and networking projects.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://github.com/mondweep/vibe-cast/tree/aws-advanced-networking"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-foreground/5 border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors rounded-lg px-4 py-2 text-sm font-mono"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    View source on GitHub
                  </a>
                  <a
                    href="https://linear.app/mondweep/project/aws-advanced-networking-course-82c5d59087e7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-foreground/5 border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors rounded-lg px-4 py-2 text-sm font-mono"
                  >
                    ◎ Project tracker (Linear)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground font-mono text-center pb-4">
          AWS Advanced Networking Course · Open source · MIT licence ·{" "}
          <a
            href="https://github.com/mondweep/vibe-cast/tree/aws-advanced-networking"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/mondweep/vibe-cast
          </a>
        </p>

      </div>
    </CourseLayout>
  );
}
