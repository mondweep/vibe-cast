import { MDXRemote } from "next-mdx-remote/rsc";
import { Badge } from "@/components/ui/badge";
import { mdxComponents } from "./mdx/MdxComponents";
import { ModuleProgress } from "./ModuleProgress";
import { ModuleData } from "@/lib/modules";
import Link from "next/link";

const domainVariantMap: Record<string, "design" | "operations" | "security" | "automation" | "exam-prep"> = {
  design: "design", operations: "operations", security: "security",
  automation: "automation", "exam-prep": "exam-prep",
};

export function ModuleViewer({ module: mod }: { module: ModuleData }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-6">
        <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground">M{mod.id} — {mod.title}</span>
      </div>

      {/* Module header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-primary text-sm font-bold">M{mod.id}</span>
          <Badge variant={domainVariantMap[mod.domain] ?? "aws"}>{mod.domain}</Badge>
          <span className="text-xs text-muted-foreground">{mod.estimatedHours}h · {mod.topics.length} topics</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">{mod.title}</h1>
      </div>

      {/* Client: progress + objectives + complete button */}
      <ModuleProgress
        moduleId={mod.id}
        title={mod.title}
        objectives={mod.objectives}
      />

      {/* Server: MDX content */}
      <article className="max-w-none">
        <MDXRemote source={mod.content} components={mdxComponents} />
      </article>
    </div>
  );
}
