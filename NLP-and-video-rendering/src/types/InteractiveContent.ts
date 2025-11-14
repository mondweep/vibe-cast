/**
 * Type definitions for interactive content components
 */

export interface BaseInteraction {
  id: string;
  type: string;
  title: string;
  instruction: string;
  estimatedTime: number;
}

export interface MCQInteraction extends BaseInteraction {
  type: 'mcq';
  questions: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    feedback: {
      correct: string;
      incorrect: string;
    };
  }[];
}

export interface DragDropInteraction extends BaseInteraction {
  type: 'drag-drop';
  items: {
    id: string;
    content: string;
    category?: string;
  }[];
  targets: {
    id: string;
    label: string;
    acceptedItems: string[];
  }[];
  correctMatches: {
    itemId: string;
    targetId: string;
  }[];
  feedback: {
    correct: string;
    incorrect: string;
  };
}

export interface HotspotInteraction extends BaseInteraction {
  type: 'hotspot';
  image: string;
  hotspots: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    correct?: boolean;
  }[];
  mode: 'reveal' | 'quiz';
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface ScenarioInteraction extends BaseInteraction {
  type: 'scenario';
  scenario: {
    context: string;
    question: string;
    options: {
      id: string;
      text: string;
      consequence: string;
      score: number;
      nextScenarioId?: string;
    }[];
  }[];
  passingScore: number;
}

export interface FlashcardInteraction extends BaseInteraction {
  type: 'flashcard';
  cards: {
    id: string;
    front: string;
    back: string;
    category?: string;
  }[];
  mode: 'study' | 'quiz';
}

export interface AssessmentInteraction extends BaseInteraction {
  type: 'assessment';
  questions: any[];
  passingScore: number;
  randomize: boolean;
  allowRetry: boolean;
  maxAttempts?: number;
}

export type InteractiveComponent =
  | MCQInteraction
  | DragDropInteraction
  | HotspotInteraction
  | ScenarioInteraction
  | FlashcardInteraction
  | AssessmentInteraction;

export interface InteractiveModule {
  id: string;
  unitId: string;
  title: string;
  components: InteractiveComponent[];
  completionCriteria: {
    type: 'all' | 'score' | 'time';
    value?: number;
  };
}

export interface InteractiveContent {
  modules: InteractiveModule[];
  totalEstimatedTime: number;
}
