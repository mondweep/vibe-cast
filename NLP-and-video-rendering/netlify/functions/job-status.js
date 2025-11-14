/**
 * Job Status Function
 * Returns current status of a background processing job
 */

const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        // Get job ID from query string
        const jobId = event.queryStringParameters?.jobId;

        if (!jobId) {
            console.error('Job status request missing jobId parameter');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Job ID is required' })
            };
        }

        console.log(`Getting status for job: ${jobId}`);

        // Try to get Netlify Blobs store
        let store;
        try {
            store = getStore('jobs');
        } catch (blobError) {
            console.error('Failed to initialize Netlify Blobs:', blobError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    message: 'Blob storage not available',
                    error: 'Failed to initialize storage. Ensure Netlify Blobs is enabled.'
                })
            };
        }

        // Get job status
        const jobData = await store.get(jobId, { type: 'text' });

        if (!jobData) {
            console.log(`Job ${jobId} not found in blob storage`);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Job not found' })
            };
        }

        const jobStatus = JSON.parse(jobData);
        console.log(`Job ${jobId} status:`, jobStatus.status);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(jobStatus)
        };

    } catch (error) {
        console.error('Job status error:', error);
        console.error('Error stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Failed to get job status',
                error: error.message,
                details: error.toString()
            })
        };
    }
};
