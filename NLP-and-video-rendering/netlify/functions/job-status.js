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
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Job ID is required' })
            };
        }

        const store = getStore('jobs');

        // Get job status
        const jobData = await store.get(jobId, { type: 'text' });

        if (!jobData) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Job not found' })
            };
        }

        const jobStatus = JSON.parse(jobData);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(jobStatus)
        };

    } catch (error) {
        console.error('Job status error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Failed to get job status',
                error: error.message
            })
        };
    }
};
