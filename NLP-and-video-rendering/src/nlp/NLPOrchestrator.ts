/**
 * NLP Orchestrator
 * Coordinates NLP processing using Claude AI and other NLP tools
 */

import Anthropic from '@anthropic-ai/sdk';
import { ParsedContent } from '../types/ParsedContent';
import {
  EnrichedContent,
  ContentUnit,
  LearningObjective,
  KeyPhrase,
  MedicalTerm,
  Question,
  SuggestedActivity,
} from '../types/EnrichedContent';

export interface NLPConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class NLPOrchestrator {
  private client: Anthropic;
  private config: NLPConfig;

  constructor(config: NLPConfig) {
    this.config = {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Process parsed content with NLP enhancements
   */
  async process(parsedContent: ParsedContent): Promise<EnrichedContent> {
    console.log('Starting NLP processing...');

    // Extract all text for analysis
    const fullText = this.extractAllText(parsedContent);

    // Analyze content with Claude AI
    const concepts = await this.extractKeyPhrases(fullText);
    const medicalTerms = await this.extractMedicalTerminology(fullText);
    const learningObjectives = await this.generateLearningObjectives(fullText, concepts);

    // Process each content unit
    const units = await this.createContentUnits(parsedContent);

    // Enrich each unit
    for (const unit of units) {
      await this.enrichUnit(unit);
    }

    const enrichedContent: EnrichedContent = {
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

  private extractAllText(parsedContent: ParsedContent): string {
    let text = '';

    if (parsedContent.type === 'powerpoint') {
      for (const slide of parsedContent.slides) {
        text += slide.title + '\n';
        for (const content of slide.content) {
          text += content.content + '\n';
        }
        text += slide.speakerNotes + '\n';
      }
    } else {
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

  private async createContentUnits(parsedContent: ParsedContent): Promise<ContentUnit[]> {
    const units: ContentUnit[] = [];

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
    } else {
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

  private async enrichUnit(unit: ContentUnit): Promise<void> {
    const combinedText = `${unit.text}\n\nSpeaker Notes: ${unit.speakerNotes}`;

    // Generate summary
    unit.summary = await this.summarizeText(combinedText);

    // Extract key points
    unit.keyPoints = await this.extractKeyPoints(combinedText);

    // Generate questions
    unit.questions = await this.generateQuestions(combinedText);

    // Assess complexity
    unit.complexityLevel = await this.assessComplexity(combinedText);

    // Calculate readability
    unit.readabilityScore = this.calculateReadability(unit.text);

    // Suggest activities
    unit.suggestedActivities = await this.suggestActivities(unit);

    // Estimate duration (words / 150 words per minute + activities)
    const wordCount = unit.text.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 150);
    const activityTime = unit.suggestedActivities.reduce(
      (sum, activity) => sum + activity.estimatedTime,
      0
    );
    unit.estimatedDuration = readingTime + activityTime;
  }

  private async extractKeyPhrases(text: string): Promise<KeyPhrase[]> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
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
    } catch (error) {
      console.warn('Error extracting key phrases:', error);
      return [];
    }
  }

  private async extractMedicalTerminology(text: string): Promise<MedicalTerm[]> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
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
    } catch (error) {
      console.warn('Error extracting medical terminology:', error);
      return [];
    }
  }

  private async generateLearningObjectives(
    text: string,
    concepts: KeyPhrase[]
  ): Promise<LearningObjective[]> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
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
    } catch (error) {
      console.warn('Error generating learning objectives:', error);
      return [];
    }
  }

  private async summarizeText(text: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model!,
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
    } catch (error) {
      console.warn('Error summarizing text:', error);
      return text.substring(0, 200) + '...';
    }
  }

  private async extractKeyPoints(text: string): Promise<string[]> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model!,
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
    } catch (error) {
      console.warn('Error extracting key points:', error);
      return [];
    }
  }

  private async generateQuestions(text: string): Promise<Question[]> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model!,
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
    } catch (error) {
      console.warn('Error generating questions:', error);
      return [];
    }
  }

  private async assessComplexity(text: string): Promise<'beginner' | 'intermediate' | 'advanced'> {
    const wordCount = text.split(/\s+/).length;
    const avgWordLength = text.replace(/\s/g, '').length / wordCount;

    // Simple heuristic: longer words and sentences = more complex
    if (avgWordLength > 6) return 'advanced';
    if (avgWordLength > 4.5) return 'intermediate';
    return 'beginner';
  }

  private calculateReadability(text: string): number {
    // Flesch Reading Ease score (simplified)
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = text.split(/[aeiou]/i).length - 1;

    if (words === 0 || sentences === 0) return 0;

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score));
  }

  private async suggestActivities(unit: ContentUnit): Promise<SuggestedActivity[]> {
    const activities: SuggestedActivity[] = [];

    // Suggest flashcards if there are key terms
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

    // Suggest drag-drop if there are multiple concepts
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

  private calculateTotalDuration(units: ContentUnit[]): number {
    return units.reduce((total, unit) => total + unit.estimatedDuration, 0);
  }
}
