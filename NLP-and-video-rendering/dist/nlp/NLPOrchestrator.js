"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLPOrchestrator = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class NLPOrchestrator {
    client;
    config;
    constructor(config) {
        this.config = {
            model: 'claude-sonnet-4-20250514',
            temperature: 0.7,
            maxTokens: 4000,
            ...config,
        };
        this.client = new sdk_1.default({
            apiKey: this.config.apiKey,
        });
    }
    async process(parsedContent) {
        console.log('Starting NLP processing...');
        const fullText = this.extractAllText(parsedContent);
        const concepts = await this.extractKeyPhrases(fullText);
        const medicalTerms = await this.extractMedicalTerminology(fullText);
        const learningObjectives = await this.generateLearningObjectives(fullText, concepts);
        const units = await this.createContentUnits(parsedContent);
        for (const unit of units) {
            await this.enrichUnit(unit);
        }
        const enrichedContent = {
            originalType: parsedContent.type,
            units,
            learningObjectives,
            concepts,
            glossary: medicalTerms,
            metadata: {
                title: parsedContent.metadata.title || 'Untitled Course',
                description: parsedContent.metadata.description || 'Healthcare eLearning Module',
                author: parsedContent.metadata.author,
                estimatedDuration: this.calculateTotalDuration(units),
                targetAudience: 'Healthcare Professionals',
            },
        };
        console.log('NLP processing completed successfully');
        return enrichedContent;
    }
    extractAllText(parsedContent) {
        let text = '';
        if (parsedContent.type === 'powerpoint') {
            for (const slide of parsedContent.slides) {
                text += slide.title + '\n';
                for (const content of slide.content) {
                    text += content.content + '\n';
                }
                text += slide.speakerNotes + '\n';
            }
        }
        else {
            for (const section of parsedContent.sections) {
                text += section.title + '\n';
                for (const content of section.content) {
                    text += content.content + '\n';
                }
                text += section.speakerNotes.join('\n') + '\n';
            }
        }
        return text;
    }
    async createContentUnits(parsedContent) {
        const units = [];
        if (parsedContent.type === 'powerpoint') {
            for (const slide of parsedContent.slides) {
                const text = slide.content.map(c => c.content).join('\n');
                units.push({
                    id: `unit-${slide.slideNumber}`,
                    title: slide.title || `Slide ${slide.slideNumber}`,
                    text,
                    speakerNotes: slide.speakerNotes,
                    media: slide.media,
                    summary: '',
                    keyPoints: [],
                    questions: [],
                    readabilityScore: 0,
                    complexityLevel: 'intermediate',
                    suggestedActivities: [],
                    estimatedDuration: 0,
                });
            }
        }
        else {
            for (let i = 0; i < parsedContent.sections.length; i++) {
                const section = parsedContent.sections[i];
                const text = section.content.map(c => c.content).join('\n');
                units.push({
                    id: `unit-${i + 1}`,
                    title: section.title,
                    text,
                    speakerNotes: section.speakerNotes.join('\n'),
                    media: section.media,
                    summary: '',
                    keyPoints: [],
                    questions: [],
                    readabilityScore: 0,
                    complexityLevel: 'intermediate',
                    suggestedActivities: [],
                    estimatedDuration: 0,
                });
            }
        }
        return units;
    }
    async enrichUnit(unit) {
        const combinedText = `${unit.text}\n\nSpeaker Notes: ${unit.speakerNotes}`;
        unit.summary = await this.summarizeText(combinedText);
        unit.keyPoints = await this.extractKeyPoints(combinedText);
        unit.questions = await this.generateQuestions(combinedText);
        unit.complexityLevel = await this.assessComplexity(combinedText);
        unit.readabilityScore = this.calculateReadability(unit.text);
        unit.suggestedActivities = await this.suggestActivities(unit);
        const wordCount = unit.text.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 150);
        const activityTime = unit.suggestedActivities.reduce((sum, activity) => sum + activity.estimatedTime, 0);
        unit.estimatedDuration = readingTime + activityTime;
    }
    async extractKeyPhrases(text) {
        try {
            const message = await this.client.messages.create({
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                messages: [
                    {
                        role: 'user',
                        content: `Extract the top 10 key concepts from this healthcare educational content. Return as JSON array with format: [{"text": "concept", "score": 0.95, "category": "medical"}]

Content:
${text.substring(0, 10000)}`,
                    },
                ],
            });
            const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        }
        catch (error) {
            console.warn('Error extracting key phrases:', error);
            return [];
        }
    }
    async extractMedicalTerminology(text) {
        try {
            const message = await this.client.messages.create({
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                temperature: 0.5,
                messages: [
                    {
                        role: 'user',
                        content: `Extract medical terminology from this content and provide definitions. Return as JSON array: [{"term": "term", "definition": "definition", "category": "category"}]

Content:
${text.substring(0, 10000)}`,
                    },
                ],
            });
            const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        }
        catch (error) {
            console.warn('Error extracting medical terminology:', error);
            return [];
        }
    }
    async generateLearningObjectives(text, concepts) {
        try {
            const message = await this.client.messages.create({
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: `Based on this content, generate 3-5 SMART learning objectives for healthcare professionals using Bloom's taxonomy. Return as JSON array: [{"id": "lo1", "objective": "objective text", "level": "understand", "assessable": true}]

Concepts: ${concepts.map(c => c.text).join(', ')}

Content:
${text.substring(0, 8000)}`,
                    },
                ],
            });
            const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        }
        catch (error) {
            console.warn('Error generating learning objectives:', error);
            return [];
        }
    }
    async summarizeText(text) {
        try {
            const message = await this.client.messages.create({
                model: this.config.model,
                max_tokens: 500,
                temperature: 0.5,
                messages: [
                    {
                        role: 'user',
                        content: `Provide a concise 2-3 sentence summary of this content for healthcare professionals:

${text.substring(0, 5000)}`,
                    },
                ],
            });
            return message.content[0].type === 'text' ? message.content[0].text : '';
        }
        catch (error) {
            console.warn('Error summarizing text:', error);
            return text.substring(0, 200) + '...';
        }
    }
    async extractKeyPoints(text) {
        try {
            const message = await this.client.messages.create({
                model: this.config.model,
                max_tokens: 1000,
                temperature: 0.5,
                messages: [
                    {
                        role: 'user',
                        content: `Extract 3-5 key takeaway points from this content. Return as JSON array of strings: ["point 1", "point 2", ...]

${text.substring(0, 5000)}`,
                    },
                ],
            });
            const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        }
        catch (error) {
            console.warn('Error extracting key points:', error);
            return [];
        }
    }
    async generateQuestions(text) {
        try {
            const message = await this.client.messages.create({
                model: this.config.model,
                max_tokens: 2000,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: `Generate 3 assessment questions (2 multiple choice, 1 scenario) based on this content. Return as JSON array with format:
[{
  "id": "q1",
  "type": "multiple-choice",
  "question": "question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "B",
  "explanation": "why this is correct",
  "difficulty": "medium",
  "relatedConcepts": ["concept1"]
}]

Content:
${text.substring(0, 5000)}`,
                    },
                ],
            });
            const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        }
        catch (error) {
            console.warn('Error generating questions:', error);
            return [];
        }
    }
    async assessComplexity(text) {
        const wordCount = text.split(/\s+/).length;
        const avgWordLength = text.replace(/\s/g, '').length / wordCount;
        if (avgWordLength > 6)
            return 'advanced';
        if (avgWordLength > 4.5)
            return 'intermediate';
        return 'beginner';
    }
    calculateReadability(text) {
        const words = text.split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).length;
        const syllables = text.split(/[aeiou]/i).length - 1;
        if (words === 0 || sentences === 0)
            return 0;
        const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
        return Math.max(0, Math.min(100, score));
    }
    async suggestActivities(unit) {
        const activities = [];
        if (unit.keyPoints.length >= 3) {
            activities.push({
                type: 'flashcards',
                title: 'Key Concepts Review',
                description: 'Review key concepts with interactive flashcards',
                instruction: 'Click each card to reveal the definition',
                estimatedTime: 3,
                data: { keyPoints: unit.keyPoints },
            });
        }
        if (unit.keyPoints.length >= 4) {
            activities.push({
                type: 'drag-drop',
                title: 'Concept Matching',
                description: 'Match concepts to their descriptions',
                instruction: 'Drag each concept to its correct description',
                estimatedTime: 5,
                data: { items: unit.keyPoints.slice(0, 5) },
            });
        }
        return activities;
    }
    calculateTotalDuration(units) {
        return units.reduce((total, unit) => total + unit.estimatedDuration, 0);
    }
}
exports.NLPOrchestrator = NLPOrchestrator;
//# sourceMappingURL=NLPOrchestrator.js.map