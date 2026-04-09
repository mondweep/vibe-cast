import { Handler } from '@netlify/functions';
import { deleteMemoryById } from '../src/services/piNetworkAPI';
import { corsHeaders, preflightResponse } from '../src/utils/cors';

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return preflightResponse;
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const encodedApiKey = event.headers['x-api-key'];
    const id = event.queryStringParameters?.id;

    if (!encodedApiKey || !id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameters: x-api-key, id' }),
      };
    }

    let apiKey: string;
    try {
      apiKey = Buffer.from(encodedApiKey, 'base64').toString('utf8');
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid API key encoding' }),
      };
    }

    console.log(`[DELETE] Requesting formal deletion for memory: ${id}`);

    await deleteMemoryById(id, { apiKey, timeout: 5000 });

    return {
      statusCode: 204, // No Content = Success
      headers: corsHeaders,
      body: '',
    };
  } catch (error: any) {
    console.error('[DELETE] Error strictly rejecting deletion:', error);
    
    // Explicitly handle forbidden state
    if (error.code === 'FORBIDDEN') {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'FORBIDDEN', message: 'You do not have permission to delete this memory.' })
      };
    }

    return {
      statusCode: error.status || 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.code || 'API_ERROR',
        message: error.message || 'Internal server error',
      }),
    };
  }
};
