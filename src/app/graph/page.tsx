import { CourseLayout } from "@/components/layout/CourseLayout";
import { KnowledgeGraph } from "@/components/graph/KnowledgeGraph";

export default function GraphPage() {
  return (
    <CourseLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">Knowledge Graph</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                67 nodes · 69 edges · AWS Advanced Networking domain ontology
              </p>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              {[
                { type: "AWSService",  color: "#f59e0b" },
                { type: "Concept",     color: "#3b82f6" },
                { type: "Pattern",     color: "#10b981" },
                { type: "ExamTopic",   color: "#f97316" },
                { type: "Module",      color: "#8b5cf6" },
                { type: "Protocol",    color: "#06b6d4" },
              ].map(({ type, color }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <p className="text-[10px] text-muted-foreground mt-2 font-mono">
            Click a node to explore · Drag to rearrange · Scroll to zoom · Click background to deselect
          </p>
        </div>

        {/* Graph canvas */}
        <div className="flex-1 relative overflow-hidden">
          <KnowledgeGraph />
        </div>
      </div>
    </CourseLayout>
  );
}
