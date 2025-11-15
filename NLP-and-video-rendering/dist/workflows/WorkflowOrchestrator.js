"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowOrchestrator = void 0;
const parsers_1 = require("../parsers");
const NLPOrchestrator_1 = require("../nlp/NLPOrchestrator");
const ActivityFactory_1 = require("../interactive/ActivityFactory");
const SCORMPackageBuilder_1 = require("../scorm/SCORMPackageBuilder");
class WorkflowOrchestrator {
    config;
    constructor(config) {
        this.config = config;
    }
    async execute() {
        console.log('Starting eLearning automation workflow...');
        console.log('===========================================\n');
        try {
            console.log('Stage 1: Parsing input document...');
            const parsedContent = await this.parseDocument();
            console.log(`✓ Successfully parsed ${parsedContent.type} document\n`);
            console.log('Stage 2: Processing with NLP and AI...');
            const enrichedContent = await this.processWithNLP(parsedContent);
            console.log(`✓ Generated ${enrichedContent.units.length} content units`);
            console.log(`✓ Created ${enrichedContent.learningObjectives.length} learning objectives`);
            console.log(`✓ Extracted ${enrichedContent.glossary.length} medical terms\n`);
            console.log('Stage 3: Generating interactive content...');
            const interactiveContent = await this.generateInteractive(enrichedContent);
            console.log(`✓ Created ${interactiveContent.modules.length} interactive modules\n`);
            let videoContent;
            if (this.config.video?.enabled) {
                console.log('Stage 4: Rendering videos...');
                videoContent = await this.renderVideos(enrichedContent);
                console.log(`✓ Rendered videos\n`);
            }
            console.log('Stage 5: Creating SCORM package...');
            const outputPath = await this.packageSCORM(enrichedContent, interactiveContent, videoContent);
            console.log(`✓ SCORM package created successfully\n`);
            console.log('===========================================');
            console.log('Workflow completed successfully!');
            console.log(`Output: ${outputPath}`);
            return outputPath;
        }
        catch (error) {
            console.error('Workflow failed:', error);
            throw error;
        }
    }
    async parseDocument() {
        const parser = (0, parsers_1.getParser)(this.config.input.filePath);
        return await parser.parse(this.config.input.filePath);
    }
    async processWithNLP(parsedContent) {
        const nlpOrchestrator = new NLPOrchestrator_1.NLPOrchestrator({
            apiKey: this.config.nlp.apiKey,
            model: this.config.nlp.model,
        });
        return await nlpOrchestrator.process(parsedContent);
    }
    async generateInteractive(enrichedContent) {
        const activityFactory = new ActivityFactory_1.ActivityFactory();
        return activityFactory.generate(enrichedContent);
    }
    async renderVideos(enrichedContent) {
        console.log('Video rendering skipped (requires additional setup)');
        return null;
    }
    async packageSCORM(enrichedContent, interactiveContent, videoContent) {
        const scormBuilder = new SCORMPackageBuilder_1.SCORMPackageBuilder(this.config.scorm);
        return await scormBuilder.build(enrichedContent, interactiveContent, videoContent, this.config.output.path);
    }
}
exports.WorkflowOrchestrator = WorkflowOrchestrator;
//# sourceMappingURL=WorkflowOrchestrator.js.map