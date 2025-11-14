/**
 * Start Processing Function
 * Initiates background processing and returns job ID
 */

const { getStore } = require('@netlify/blobs');

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
        // Generate job ID
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const store = getStore('jobs');

        // Initialize job status
        await store.set(jobId, JSON.stringify({
            status: 'queued',
            progress: 0,
            message: 'Job queued for processing...'
        }));

        // Invoke background function asynchronously
        const backgroundUrl = `${process.env.URL}/.netlify/functions/process-document-background`;

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
            store.set(jobId, JSON.stringify({
                status: 'error',
                progress: 0,
                message: 'Failed to start background processing',
                error: err.toString()
            }));
        });

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
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Failed to start processing',
                error: error.message
            })
        };
    }
};
