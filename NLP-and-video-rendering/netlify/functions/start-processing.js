/**
 * Start Processing Function
 * Initiates background processing and returns job ID
 */

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

        // Invoke background function
        const backgroundUrl = `${process.env.URL}/.netlify/functions/process-document-background`;

        // Start background processing (fire and forget)
        fetch(backgroundUrl, {
            method: 'POST',
            headers: {
                'Content-Type': event.headers['content-type'],
                'X-Job-ID': jobId
            },
            body: event.body
        }).catch(err => {
            console.error('Background invocation error:', err);
        });

        // Return job ID immediately
        return {
            statusCode: 202,
            headers,
            body: JSON.stringify({
                jobId,
                status: 'processing',
                message: 'Processing started. Use job ID to check status.'
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
