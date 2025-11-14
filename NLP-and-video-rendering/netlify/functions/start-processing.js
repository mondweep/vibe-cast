/**
 * Start Processing Function
 * Initiates background processing and returns job ID
 */

const { getStore } = require('@netlify/blobs');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        // Check if API key is configured
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('ANTHROPIC_API_KEY not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    message: 'Server configuration error',
                    error: 'API key not configured. Please contact administrator.'
                })
            };
        }

        // Generate job ID
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Starting new processing job: ${jobId}`);

        // Try to get Netlify Blobs store with manual configuration
        let store;
        try {
            // Netlify provides these environment variables in deployed functions
            const siteID = process.env.SITE_ID;
            const token = process.env.NETLIFY_BLOBS_CONTEXT;

            if (!siteID) {
                throw new Error('SITE_ID environment variable not found. Ensure function is deployed to Netlify.');
            }

            // Create store with explicit configuration
            const storeConfig = token ? { siteID, token } : { siteID };
            store = getStore({ name: 'jobs', ...storeConfig });
            console.log('Netlify Blobs store initialized successfully with site ID:', siteID);
        } catch (blobError) {
            console.error('Failed to initialize Netlify Blobs:', blobError);
            console.error('SITE_ID:', process.env.SITE_ID);
            console.error('NETLIFY_BLOBS_CONTEXT available:', !!process.env.NETLIFY_BLOBS_CONTEXT);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    message: 'Blob storage not available',
                    error: blobError.message || 'Failed to initialize storage.'
                })
            };
        }

        // Initialize job status
        await store.set(jobId, JSON.stringify({
            status: 'queued',
            progress: 0,
            message: 'Job queued for processing...'
        }));

        console.log(`Job ${jobId} initialized in blob storage`);

        // Invoke background function asynchronously
        const backgroundUrl = `${process.env.URL}/.netlify/functions/process-document-background`;
        console.log(`Invoking background function at: ${backgroundUrl}`);

        // Use context.callbackWaitsForEmptyEventLoop for true async
        context.callbackWaitsForEmptyEventLoop = false;

        // Start background processing
        fetch(backgroundUrl, {
            method: 'POST',
            headers: {
                'Content-Type': event.headers['content-type'] || 'multipart/form-data',
                'X-Job-ID': jobId
            },
            body: event.body
        }).catch(err => {
            console.error('Background invocation error:', err);
            console.error('Error stack:', err.stack);
            store.set(jobId, JSON.stringify({
                status: 'error',
                progress: 0,
                message: 'Failed to start background processing',
                error: err.toString()
            })).catch(storeErr => {
                console.error('Failed to update job status:', storeErr);
            });
        });

        console.log(`Background function invoked for job ${jobId}`);

        // Return job ID immediately
        return {
            statusCode: 202,
            headers,
            body: JSON.stringify({
                jobId,
                status: 'queued',
                message: 'Processing started. Poll status endpoint for progress.'
            })
        };

    } catch (error) {
        console.error('Start processing error:', error);
        console.error('Error stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Failed to start processing',
                error: error.message,
                details: error.toString()
            })
        };
    }
};
