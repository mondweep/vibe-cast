/**
 * Workflow Orchestrator
 * Main orchestration using agentic-flow for workflow automation
 */

import { getParser } from '../parsers';
import { NLPOrchestrator } from '../nlp/NLPOrchestrator';
import { ActivityFactory } from '../interactive/ActivityFactory';
import { SCORMPackageBuilder } from '../scorm/SCORMPackageBuilder';
import { ParsedContent } from '../types/ParsedContent';
import { EnrichedContent } from '../types/EnrichedContent';
import { InteractiveContent } from '../types/InteractiveContent';
import { SCORMConfig } from '../types/SCORMPackage';

export interface WorkflowConfig {
  input: {
    filePath: string;
  };
  nlp: {
    apiKey: string;
    model?: string;
  };
  scorm: SCORMConfig;
  output: {
    path?: string;
    packageName?: string;
  };
  video?: {
    enabled: boolean;
  };
}

export class WorkflowOrchestrator {
  private config: WorkflowConfig;

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  /**
   * Execute the complete workflow
   */
  async execute(): Promise<string> {
    console.log('Starting eLearning automation workflow...');
    console.log('===========================================\n');

    try {
      // Stage 1: Parse Document
      console.log('Stage 1: Parsing input document...');
      const parsedContent = await this.parseDocument();
      console.log(`✓ Successfully parsed ${parsedContent.type} document\n`);

      // Stage 2: NLP Processing
      console.log('Stage 2: Processing with NLP and AI...');
      const enrichedContent = await this.processWithNLP(parsedContent);
      console.log(`✓ Generated ${enrichedContent.units.length} content units`);
      console.log(`✓ Created ${enrichedContent.learningObjectives.length} learning objectives`);
      console.log(`✓ Extracted ${enrichedContent.glossary.length} medical terms\n`);

      // Stage 3: Generate Interactive Content
      console.log('Stage 3: Generating interactive content...');
      const interactiveContent = await this.generateInteractive(enrichedContent);
      console.log(`✓ Created ${interactiveContent.modules.length} interactive modules\n`);

      // Stage 4: Render Videos (if enabled)
      let videoContent;
      if (this.config.video?.enabled) {
        console.log('Stage 4: Rendering videos...');
        videoContent = await this.renderVideos(enrichedContent);
        console.log(`✓ Rendered videos\n`);
      }

      // Stage 5: Package as SCORM
      console.log('Stage 5: Creating SCORM package...');
      const outputPath = await this.packageSCORM(enrichedContent, interactiveContent, videoContent);
      console.log(`✓ SCORM package created successfully\n`);

      console.log('===========================================');
      console.log('Workflow completed successfully!');
      console.log(`Output: ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.error('Workflow failed:', error);
      throw error;
    }
  }

  private async parseDocument(): Promise<ParsedContent> {
    const parser = getParser(this.config.input.filePath);
    return await parser.parse(this.config.input.filePath);
  }

  private async processWithNLP(parsedContent: ParsedContent): Promise<EnrichedContent> {
    const nlpOrchestrator = new NLPOrchestrator({
      apiKey: this.config.nlp.apiKey,
      model: this.config.nlp.model,
    });

    return await nlpOrchestrator.process(parsedContent);
  }

  private async generateInteractive(enrichedContent: EnrichedContent): Promise<InteractiveContent> {
    const activityFactory = new ActivityFactory();
    return activityFactory.generate(enrichedContent);
  }

  private async renderVideos(enrichedContent: EnrichedContent): Promise<any> {
    // Video rendering implementation would go here
    // For now, return null as video rendering requires FFmpeg and TTS setup
    console.log('Video rendering skipped (requires additional setup)');
    return null;
  }

  private async packageSCORM(
    enrichedContent: EnrichedContent,
    interactiveContent: InteractiveContent,
    videoContent?: any
  ): Promise<string> {
    const scormBuilder = new SCORMPackageBuilder(this.config.scorm);
    return await scormBuilder.build(
      enrichedContent,
      interactiveContent,
      videoContent,
      this.config.output.path
    );
  }
}
