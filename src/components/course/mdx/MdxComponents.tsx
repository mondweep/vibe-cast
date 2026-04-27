import React from "react";

function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "tip" | "warning" | "exam" }) {
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

export const mdxComponents = {
  h1: (p: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 border-b border-border pb-3" {...p} />,
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="text-xl font-bold text-foreground mt-8 mb-3" {...p} />,
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-base font-bold text-foreground mt-6 mb-2" {...p} />,
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => <p className="text-muted-foreground leading-7 mb-4" {...p} />,
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-muted-foreground" {...p} />,
  ol: (p: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-muted-foreground" {...p} />,
  li: (p: React.HTMLAttributes<HTMLLIElement>) => <li className="leading-relaxed" {...p} />,
  blockquote: (p: React.HTMLAttributes<HTMLElement>) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-primary/5 py-2 rounded-r-lg" {...p} />
  ),
  code: ({ className, children, ...p }: React.HTMLAttributes<HTMLElement>) => {
    const isBlock = className?.includes("language-");
    if (isBlock) return (
      <code className={`block bg-[#0d1117] text-[#e6edf3] rounded-lg p-4 mb-4 overflow-x-auto text-sm font-mono leading-relaxed ${className}`} {...p}>
        {children}
      </code>
    );
    return <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-sm font-mono" {...p}>{children}</code>;
  },
  pre: ({ children }: { children: React.ReactNode }) => <pre className="mb-4 rounded-lg overflow-hidden">{children}</pre>,
  table: (p: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm border-collapse" {...p} />
    </div>
  ),
  th: (p: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="text-left px-4 py-2 border border-border bg-muted text-foreground font-semibold text-xs uppercase tracking-wider" {...p} />
  ),
  td: (p: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-2.5 border border-border text-muted-foreground" {...p} />
  ),
  strong: (p: React.HTMLAttributes<HTMLElement>) => <strong className="text-foreground font-semibold" {...p} />,
  hr: () => <hr className="border-border my-8" />,
  Callout,
};
