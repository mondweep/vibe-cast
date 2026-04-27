import React from "react";
import type { MDXComponents } from "mdx/types";

function Callout({ children, type = "info" }: { children?: React.ReactNode; type?: "info" | "tip" | "warning" | "exam" }) {
  const styles: Record<string, string> = {
    info:    "border-blue-500/40 bg-blue-500/5 text-blue-300",
    tip:     "border-emerald-500/40 bg-emerald-500/5 text-emerald-300",
    warning: "border-amber-500/40 bg-amber-500/5 text-amber-300",
    exam:    "border-orange-500/40 bg-orange-500/10 text-orange-300",
  };
  const icons: Record<string, string> = { info: "ℹ", tip: "✓", warning: "⚠", exam: "★" };
  return (
    <div className={`my-4 rounded-lg border p-4 ${styles[type]}`}>
      <span className="font-bold mr-2">{icons[type]}</span>
      {children}
    </div>
  );
}

export const mdxComponents: MDXComponents = {
  h1: (p) => <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 border-b border-border pb-3" {...p} />,
  h2: (p) => <h2 className="text-xl font-bold text-foreground mt-8 mb-3" {...p} />,
  h3: (p) => <h3 className="text-base font-bold text-foreground mt-6 mb-2" {...p} />,
  p:  (p) => <p className="text-muted-foreground leading-7 mb-4" {...p} />,
  ul: (p) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-muted-foreground ml-2" {...p} />,
  ol: (p) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-muted-foreground ml-2" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  blockquote: (p) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-primary/5 py-2 pr-4 rounded-r-lg" {...p} />
  ),
  code: ({ className, children, ...p }) => {
    const isBlock = String(className ?? "").includes("language-");
    return isBlock
      ? <code className={`block bg-[#0d1117] text-[#e6edf3] rounded-lg p-4 mb-4 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre ${className ?? ""}`} {...p}>{children}</code>
      : <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-sm font-mono" {...p}>{children}</code>;
  },
  pre: ({ children, ...p }) => (
    <pre className="mb-4 rounded-lg overflow-hidden bg-[#0d1117]" {...p}>{children}</pre>
  ),
  // ── TABLE — fully styled, never renders as raw markdown ──────
  table: (p) => (
    <div className="overflow-x-auto mb-6 rounded-lg border border-border">
      <table className="w-full text-sm border-collapse" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-muted/60" {...p} />,
  tbody: (p) => <tbody className="divide-y divide-border" {...p} />,
  tr: (p) => <tr className="hover:bg-muted/20 transition-colors" {...p} />,
  th: (p) => (
    <th className="text-left px-4 py-2.5 text-foreground font-semibold text-xs uppercase tracking-wider border-b border-border" {...p} />
  ),
  td: (p) => (
    <td className="px-4 py-2.5 text-muted-foreground align-top" {...p} />
  ),
  strong: (p) => <strong className="text-foreground font-semibold" {...p} />,
  em: (p) => <em className="italic text-muted-foreground" {...p} />,
  hr: () => <hr className="border-border my-8" />,
  a: ({ href, children, ...p }) => (
    <a href={href} className="text-primary underline underline-offset-4 hover:text-primary/80" target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined} {...p}>
      {children}
    </a>
  ),
  Callout,
} as MDXComponents;
