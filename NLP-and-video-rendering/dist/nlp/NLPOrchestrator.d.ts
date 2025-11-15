import { ParsedContent } from '../types/ParsedContent';
import { EnrichedContent } from '../types/EnrichedContent';
export interface NLPConfig {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}
export declare class NLPOrchestrator {
    private client;
    private config;
    constructor(config: NLPConfig);
    process(parsedContent: ParsedContent): Promise<EnrichedContent>;
    private extractAllText;
    private createContentUnits;
    private enrichUnit;
    private extractKeyPhrases;
    private extractMedicalTerminology;
    private generateLearningObjectives;
    private summarizeText;
    private extractKeyPoints;
    private generateQuestions;
    private assessComplexity;
    private calculateReadability;
    private suggestActivities;
    private calculateTotalDuration;
}
//# sourceMappingURL=NLPOrchestrator.d.ts.map