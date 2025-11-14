/**
 * Netlify Background Function: Process Document
 * Handles long-running document processing (up to 15 minutes)
 *
 * Requires: Netlify Pro account
 */

const { parse: parseMultipart } = require('lambda-multipart-parser');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Import our processing modules
const { getParser } = require('../../src/parsers');
const { NLPOrchestrator } = require('../../src/nlp/NLPOrchestrator');
const { ActivityFactory } = require('../../src/interactive/ActivityFactory');
const { SCORMPackageBuilder } = require('../../src/scorm/SCORMPackageBuilder');

exports.handler = async (event, context) => {
    console.log('Background function started');

    try {
        // Parse multipart form data
        const result = await parseMultipart(event);

        if (!result.files || result.files.length === 0) {
            throw new Error('No file uploaded');
        }

        const uploadedFile = result.files[0];
        const jobId = event.headers['x-job-id'] || Date.now().toString();

        console.log(`Processing job ${jobId}: ${uploadedFile.filename}`);

        // Validate file
        const validExtensions = ['.pptx', '.docx'];
        const fileExt = path.extname(uploadedFile.filename).toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            throw new Error('Invalid file type');
        }

        // Check API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error('API key not configured');
        }

        // Create temp file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, uploadedFile.filename);
        await fs.writeFile(tempFilePath, uploadedFile.content);

        console.log('Starting document processing...');

        // 1. Parse document
        console.log('Step 1: Parsing document...');
        const parser = getParser(tempFilePath);
        const parsedContent = await parser.parse(tempFilePath);

        // 2. NLP processing
        console.log('Step 2: NLP processing...');
        const nlpOrchestrator = new NLPOrchestrator({ apiKey });
        const enrichedContent = await nlpOrchestrator.process(parsedContent);

        // 3. Generate interactive content
        console.log('Step 3: Generating interactive content...');
        const activityFactory = new ActivityFactory();
        const interactiveContent = activityFactory.generate(enrichedContent);

        // 4. Create SCORM package
        console.log('Step 4: Creating SCORM package...');
        const scormBuilder = new SCORMPackageBuilder({
            version: '1.2',
            masteryScore: 80,
            enableBookmarking: true,
            enableTracking: true
        });

        const outputDir = path.join(tempDir, `scorm-${jobId}`);
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, 'scorm-package.zip');

        await scormBuilder.build(
            enrichedContent,
            interactiveContent,
            null,
            outputPath
        );

        // Read the package
        const packageData = await fs.readFile(outputPath);
        const packageBase64 = packageData.toString('base64');

        // Calculate statistics
        const stats = {
            modulesCount: interactiveContent.modules.length,
            objectivesCount: enrichedContent.learningObjectives.length,
            questionsCount: enrichedContent.units.reduce(
                (sum, unit) => sum + unit.questions.length,
                0
            ),
            estimatedDuration: enrichedContent.metadata.estimatedDuration,
        };

        // Clean up temp files
        await fs.unlink(tempFilePath);
        await fs.unlink(outputPath);

        console.log(`Job ${jobId} completed successfully`);

        // Return result
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                jobId,
                ...stats,
                package: packageBase64,
                packageSize: packageData.length,
                message: 'SCORM package generated successfully'
            })
        };

    } catch (error) {
        console.error('Background function error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: error.message,
                error: error.toString()
            })
        };
    }
};
