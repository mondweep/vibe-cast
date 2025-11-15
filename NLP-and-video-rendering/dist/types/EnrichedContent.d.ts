import { SlideData, SectionData } from './ParsedContent';
export interface KeyPhrase {
    text: string;
    score: number;
    category?: string;
}
export interface MedicalTerm {
    term: string;
    definition: string;
    source?: string;
    category?: string;
}
export interface LearningObjective {
    id: string;
    objective: string;
    level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
    assessable: boolean;
}
export interface Question {
    id: string;
    type: 'multiple-choice' | 'true-false' | 'scenario' | 'fill-blank' | 'matching';
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    relatedConcepts: string[];
}
export interface SuggestedActivity {
    type: 'drag-drop' | 'hotspot' | 'simulation' | 'flashcards' | 'timeline' | 'case-study';
    title: string;
    description: string;
    instruction: string;
    estimatedTime: number;
    data: any;
}
export interface ContentUnit {
    id: string;
    title: string;
    text: string;
    speakerNotes: string;
    media: any[];
    summary: string;
    keyPoints: string[];
    questions: Question[];
    readabilityScore: number;
    complexityLevel: 'beginner' | 'intermediate' | 'advanced';
    suggestedActivities: SuggestedActivity[];
    estimatedDuration: number;
}
export interface EnrichedSlide extends SlideData {
    unit: ContentUnit;
}
export interface EnrichedSection extends SectionData {
    unit: ContentUnit;
}
export interface EnrichedContent {
    originalType: 'powerpoint' | 'word';
    units: ContentUnit[];
    slides?: EnrichedSlide[];
    sections?: EnrichedSection[];
    learningObjectives: LearningObjective[];
    concepts: KeyPhrase[];
    glossary: MedicalTerm[];
    metadata: {
        title: string;
        description: string;
        author?: string;
        estimatedDuration: number;
        targetAudience: string;
        prerequisites?: string[];
    };
}
//# sourceMappingURL=EnrichedContent.d.ts.map