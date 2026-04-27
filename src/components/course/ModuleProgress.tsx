"use client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProgress } from "@/contexts/ProgressContext";

interface ModuleProgressProps {
  moduleId: string;
  title: string;
  objectives: { id: string; description: string }[];
}

const TOTAL_LESSONS = 5;

export function ModuleProgress({ moduleId, title, objectives }: ModuleProgressProps) {
  const { completeLesson, getProgress, tracker } = useProgress();
  const progress = getProgress(moduleId, TOTAL_LESSONS);
  const score = tracker.moduleScores[moduleId];

  function markComplete() {
    completeLesson(moduleId, `${moduleId}-main`, 30);
  }

  return (
    <>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-8">
        <Progress value={progress} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground font-mono">{progress}%</span>
        {score !== undefined && (
          <span className="text-xs font-mono text-emerald-400 ml-1">Score: {score}%</span>
        )}
      </div>

      {/* Objectives */}
      {objectives.length > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Learning Objectives</p>
          <ul className="space-y-2">
            {objectives.map(o => (
              <li key={o.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">→</span>
                <span>{o.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete button — bottom */}
      <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground font-mono">
          {progress === 100 ? "✓ Module complete" : `Mark each lesson complete as you go`}
        </div>
        <Button
          onClick={markComplete}
          variant={progress === 100 ? "outline" : "default"}
          className="font-mono"
        >
          {progress === 100 ? "✓ Completed" : "Mark lesson complete →"}
        </Button>
      </div>
    </>
  );
}
