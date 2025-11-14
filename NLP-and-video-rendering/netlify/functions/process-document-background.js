/**
 * Netlify Background Function: Process Document
 * Handles long-running document processing (up to 15 minutes with Netlify Pro)
 */

const { getStore } = require('@netlify/blobs');
const { parse: parseMultipart } = require('lambda-multipart-parser');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Import our processing modules
const { getParser } = require('../../dist/parsers');
const { NLPOrchestrator } = require('../../dist/nlp/NLPOrchestrator');
const { ActivityFactory } = require('../../dist/interactive/ActivityFactory');
const { SCORMPackageBuilder } = require('../../dist/scorm/SCORMPackageBuilder');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Job-ID',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Get job ID from header or generate new one
    let jobId = event.headers['x-job-id'];
    if (!jobId) {
        jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const store = getStore('jobs');

    console.log(`Background function started for job ${jobId}`);

    try {
        // Initialize job status immediately
        await store.set(jobId, JSON.stringify({
            status: 'processing',
            progress: 0,
            message: 'Starting document processing...'
        }));

        // Parse multipart form data first
        const result = await parseMultipart(event);

        if (!result.files || result.files.length === 0) {
            throw new Error('No file uploaded');
        }

        const uploadedFile = result.files[0];
        console.log(`Processing: ${uploadedFile.filename}`);

        // Validate file
        const validExtensions = ['.pptx', '.docx'];
        const fileExt = path.extname(uploadedFile.filename).toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            throw new Error('Invalid file type. Please upload .pptx or .docx files only.');
        }

        // Check file size
        const maxSize = 50 * 1024 * 1024;
        if (uploadedFile.content.length > maxSize) {
            throw new Error('File size exceeds 50MB limit.');
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

        // Step 1: Parse document (25%)
        await store.set(jobId, JSON.stringify({
            status: 'processing',
            progress: 10,
            message: 'Parsing document and extracting content...'
        }));

        const parser = getParser(tempFilePath);
        const parsedContent = await parser.parse(tempFilePath);

        // Step 2: NLP processing (25-75%)
        await store.set(jobId, JSON.stringify({
            status: 'processing',
            progress: 25,
            message: 'Processing with AI - generating objectives and questions...'
        }));

        const nlpOrchestrator = new NLPOrchestrator({ apiKey });
        const enrichedContent = await nlpOrchestrator.process(parsedContent);

        // Step 3: Generate interactive content (75-85%)
        await store.set(jobId, JSON.stringify({
            status: 'processing',
            progress: 75,
            message: 'Creating interactive activities and assessments...'
        }));

        const activityFactory = new ActivityFactory();
        const interactiveContent = activityFactory.generate(enrichedContent);

        // Step 4: Create SCORM package (85-100%)
        await store.set(jobId, JSON.stringify({
            status: 'processing',
            progress: 85,
            message: 'Building SCORM package...'
        }));

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

        // Store result
        await store.set(jobId, JSON.stringify({
            status: 'complete',
            progress: 100,
            message: 'SCORM package generated successfully!',
            result: {
                ...stats,
                package: packageBase64,
                packageSize: packageData.length,
                fileName: `${path.basename(uploadedFile.filename, path.extname(uploadedFile.filename))}-scorm.zip`
            }
        }), {
            metadata: { ttl: 3600 } // Keep result for 1 hour
        });

        // Clean up temp files
        await fs.unlink(tempFilePath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        await fs.rmdir(outputDir).catch(() => {});

        console.log(`Job ${jobId} completed successfully`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                jobId,
                message: 'Processing completed'
            })
        };

    } catch (error) {
        console.error(`Job ${jobId} failed:`, error);

        // Store error
        await store.set(jobId, JSON.stringify({
            status: 'error',
            progress: 0,
            message: error.message || 'Processing failed',
            error: error.toString()
        })).catch(err => console.error('Failed to store error:', err));

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                jobId,
                message: error.message
            })
        };
    }
};

