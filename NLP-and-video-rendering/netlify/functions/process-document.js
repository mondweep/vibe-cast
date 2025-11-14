/**
 * Netlify Function: Process Document
 * Handles document upload and SCORM generation
 *
 * Note: Due to Netlify Function time limits (10s default, 26s Pro),
 * long-running processes should use background functions or external processing.
 *
 * For production, consider:
 * 1. AWS Lambda with longer timeouts
 * 2. Queue-based processing (SQS + worker)
 * 3. Step Functions for orchestration
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
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        // Parse multipart form data
        const result = await parseMultipart(event);

        if (!result.files || result.files.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'No file uploaded' })
            };
        }

        const uploadedFile = result.files[0];

        // Validate file type
        const validExtensions = ['.pptx', '.docx'];
        const fileExt = path.extname(uploadedFile.filename).toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    message: 'Invalid file type. Please upload .pptx or .docx files only.'
                })
            };
        }

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024;
        if (uploadedFile.content.length > maxSize) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    message: 'File size exceeds 50MB limit.'
                })
            };
        }

        // Check for API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    message: 'Server configuration error: API key not set'
                })
            };
        }

        // Create temp file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, uploadedFile.filename);
        await fs.writeFile(tempFilePath, uploadedFile.content);

        try {
            // Process the document
            console.log('Starting document processing...');

            // 1. Parse document
            const parser = getParser(tempFilePath);
            const parsedContent = await parser.parse(tempFilePath);

            // 2. NLP processing
            const nlpOrchestrator = new NLPOrchestrator({ apiKey });
            const enrichedContent = await nlpOrchestrator.process(parsedContent);

            // 3. Generate interactive content
            const activityFactory = new ActivityFactory();
            const interactiveContent = activityFactory.generate(enrichedContent);

            // 4. Create SCORM package
            const scormBuilder = new SCORMPackageBuilder({
                version: '1.2',
                masteryScore: 80,
                enableBookmarking: true,
                enableTracking: true
            });

            const outputDir = path.join(tempDir, `scorm-${Date.now()}`);
            await fs.mkdir(outputDir, { recursive: true });
            const outputPath = path.join(outputDir, 'scorm-package.zip');

            await scormBuilder.build(
                enrichedContent,
                interactiveContent,
                null, // No video for now
                outputPath
            );

            // Read the generated package
            const packageData = await fs.readFile(outputPath);
            const packageBase64 = packageData.toString('base64');

            // Calculate statistics
            const modulesCount = interactiveContent.modules.length;
            const objectivesCount = enrichedContent.learningObjectives.length;
            const questionsCount = enrichedContent.units.reduce(
                (sum, unit) => sum + unit.questions.length,
                0
            );
            const estimatedDuration = enrichedContent.metadata.estimatedDuration;

            // Clean up temp files
            await fs.unlink(tempFilePath);
            await fs.unlink(outputPath);

            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    modulesCount,
                    objectivesCount,
                    questionsCount,
                    estimatedDuration,
                    package: packageBase64,
                    packageSize: packageData.length,
                    message: 'SCORM package generated successfully'
                })
            };

        } catch (processingError) {
            console.error('Processing error:', processingError);

            // Clean up temp file
            try {
                await fs.unlink(tempFilePath);
            } catch (e) {
                // Ignore cleanup errors
            }

            throw processingError;
        }

    } catch (error) {
        console.error('Function error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Processing failed: ' + error.message,
                error: error.toString()
            })
        };
    }
};
