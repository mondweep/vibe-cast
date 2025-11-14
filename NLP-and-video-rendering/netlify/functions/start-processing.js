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

        // Try to get Netlify Blobs store
        let store;
        try {
            // Log available environment variables for debugging
            const envVars = Object.keys(process.env).filter(k =>
                k.includes('NETLIFY') || k.includes('SITE') || k.includes('DEPLOY') ||
                k === 'URL' || k === 'CONTEXT'
            );
            console.log('Netlify-related env vars found:', envVars);
            envVars.forEach(key => {
                console.log(`  ${key}:`, process.env[key] ? `"${process.env[key]}"` : 'undefined');
            });

            // Try automatic initialization first (should work in Netlify environment)
            try {
                store = getStore('jobs');
                console.log('✓ Netlify Blobs store initialized with automatic configuration');
            } catch (autoError) {
                console.log('✗ Automatic initialization failed:', autoError.message);

                // Manual fallback - need both siteID and token
                const siteID = process.env.SITE_ID;
                if (!siteID) {
                    throw new Error(`Cannot initialize Blobs: SITE_ID environment variable not found. Auto-init error: ${autoError.message}`);
                }

                // Try to get token from multiple sources
                let token = process.env.NETLIFY_BLOBS_CONTEXT;

                // If NETLIFY_BLOBS_CONTEXT not available, try NETLIFY_TOKEN (user-provided)
                if (!token && process.env.NETLIFY_TOKEN) {
                    token = process.env.NETLIFY_TOKEN;
                    console.log('Using NETLIFY_TOKEN for Blobs authentication');
                }

                if (!token) {
                    throw new Error(
                        'Cannot initialize Blobs: No auth token found. ' +
                        'Please create a Netlify Personal Access Token and add it as NETLIFY_TOKEN environment variable. ' +
                        'Get it from: Netlify Dashboard → User Settings → Applications → Personal access tokens → New access token'
                    );
                }

                console.log('Attempting manual initialization with SITE_ID:', siteID);
                store = getStore({ name: 'jobs', siteID, token });
                console.log('✓ Netlify Blobs store initialized with manual configuration');
            }
        } catch (blobError) {
            console.error('Failed to initialize Netlify Blobs:', blobError);
            console.error('Error details:', blobError.message);
            console.error('Stack:', blobError.stack);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    message: 'Blob storage not available',
                    error: blobError.message,
                    help: 'Check Netlify function logs for environment variable details'
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

        // event.body is base64 encoded, need to decode it for the background function
        const bodyBuffer = event.isBase64Encoded ?
            Buffer.from(event.body, 'base64') :
            event.body;

        // Start background processing (don't await - fire and forget)
        fetch(backgroundUrl, {
            method: 'POST',
            headers: {
                'Content-Type': event.headers['content-type'] || 'multipart/form-data',
                'X-Job-ID': jobId
            },
            body: bodyBuffer
        })
        .then(response => {
            console.log(`Background function response status: ${response.status}`);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Background function error response:', text);
                });
            }
        })
        .catch(err => {
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
