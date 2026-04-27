import { ModuleDomain, DifficultyLevel } from "@/types";

export interface LearningObjective {
  id: string;
  description: string;
  bloomsLevel: "remember" | "understand" | "apply" | "analyse" | "evaluate" | "create";
}

export interface Module {
  id: string;                   // e.g. "M01"
  slug: string;                 // e.g. "vpc-deep-dive"
  title: string;
  domain: ModuleDomain;
  difficulty: DifficultyLevel;
  estimatedHours: number;
  objectives: LearningObjective[];
  prerequisites: string[];      // Module IDs
  topics: string[];
  isPublished: boolean;
}

export function createModule(props: Omit<Module, "isPublished">): Module {
  if (!props.id) throw new Error("Module id is required");
  if (!props.title) throw new Error("Module title is required");
  if (props.estimatedHours <= 0) throw new Error("estimatedHours must be positive");
  return { ...props, isPublished: false };
}

export function publishModule(module: Module): Module {
  if (module.objectives.length === 0)
    throw new Error("Cannot publish module with no learning objectives");
  return { ...module, isPublished: true };
}
