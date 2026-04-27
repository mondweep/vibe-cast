import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function ModulesPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <Link href="/" className="text-xs text-muted-foreground font-mono hover:text-primary mb-6 block">← Home</Link>
      <h1 className="text-2xl font-bold text-foreground mb-2">All Modules</h1>
      <p className="text-muted-foreground text-sm mb-8">Content coming in Phase 2 (June–July 2026)</p>
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">Module content is being authored. Check back soon.</p>
        <Badge variant="aws" className="mt-4">Phase 2 — In Progress</Badge>
      </div>
    </main>
  );
}
