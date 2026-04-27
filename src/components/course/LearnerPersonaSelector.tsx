"use client";
import { PersonaType } from "@/types";
import { cn } from "@/lib/utils";

interface PersonaOption {
  type: PersonaType;
  icon: string;
  label: string;
  description: string;
  path: string;
}

const PERSONAS: PersonaOption[] = [
  {
    type: "student",
    icon: "◈",
    label: "Student",
    description: "Certification-focused. Following the structured path from fundamentals to exam mastery.",
    path: "Foundation → Core → Exam Prep",
  },
  {
    type: "teacher",
    icon: "◇",
    label: "Teacher",
    description: "Educator or trainer delivering this course. Includes facilitator guides and assessment banks.",
    path: "All modules + Facilitator view",
  },
  {
    type: "practitioner",
    icon: "▦",
    label: "Practitioner",
    description: "Cloud engineer upskilling. Non-linear access — jump to the module you need.",
    path: "Non-linear — deep dives",
  },
];

interface LearnerPersonaSelectorProps {
  selected?: PersonaType;
  onSelect: (persona: PersonaType) => void;
}

export function LearnerPersonaSelector({
  selected,
  onSelect,
}: LearnerPersonaSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="radiogroup" aria-label="Select your learning persona">
      {PERSONAS.map((p) => (
        <button
          key={p.type}
          role="radio"
          aria-checked={selected === p.type}
          onClick={() => onSelect(p.type)}
          className={cn(
            "text-left rounded-lg border p-5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected === p.type
              ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]"
              : "border-border bg-card hover:border-primary/30"
          )}
        >
          <span className="text-2xl block mb-2" aria-hidden="true">{p.icon}</span>
          <h3 className="font-bold text-foreground text-sm mb-1">{p.label}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.description}</p>
          <p className="text-xs font-mono text-primary">{p.path}</p>
        </button>
      ))}
    </div>
  );
}
