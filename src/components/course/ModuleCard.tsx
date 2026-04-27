import { Module } from "@/domains/course/entities/Module";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  module: Module;
  progressPercent?: number;
  isLocked?: boolean;
  onClick?: () => void;
}

const domainVariantMap: Record<string, "design" | "operations" | "security" | "automation" | "exam-prep"> = {
  design: "design",
  operations: "operations",
  security: "security",
  automation: "automation",
  "exam-prep": "exam-prep",
};

export function ModuleCard({
  module,
  progressPercent = 0,
  isLocked = false,
  onClick,
}: ModuleCardProps) {
  return (
    <article
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-label={`${module.title} — ${module.estimatedHours} hours`}
      onClick={!isLocked ? onClick : undefined}
      onKeyDown={(e) => { if (e.key === "Enter" && !isLocked && onClick) onClick(); }}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-5 transition-all duration-200",
        isLocked
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="font-mono text-xs text-primary font-bold">M{module.id}</span>
          <h3 className="font-semibold text-foreground mt-0.5 text-sm leading-snug">
            {module.title}
          </h3>
        </div>
        <Badge variant={domainVariantMap[module.domain] ?? "aws"}>
          {module.domain}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Progress value={progressPercent} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          {progressPercent}%
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">
          {module.estimatedHours}h · {module.topics.length} topics
        </span>
        {isLocked && (
          <span className="text-xs text-muted-foreground">🔒 locked</span>
        )}
      </div>
    </article>
  );
}
