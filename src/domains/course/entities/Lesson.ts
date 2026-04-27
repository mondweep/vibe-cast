export type ContentBlockType = "prose" | "code" | "diagram" | "quiz" | "lab" | "callout";

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface Lesson {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  orderIndex: number;
  estimatedMinutes: number;
  contentBlocks: ContentBlock[];
  isPublished: boolean;
}

export function createLesson(props: Omit<Lesson, "isPublished">): Lesson {
  if (!props.moduleId) throw new Error("moduleId is required");
  if (props.orderIndex < 0) throw new Error("orderIndex must be non-negative");
  return { ...props, isPublished: false };
}
