import { Handler } from '@netlify/functions';
import { getMemoryById } from '../src/services/piNetworkAPI';
import { corsHeaders, preflightResponse } from '../src/utils/cors';

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return preflightResponse;
  }

  if (event.httpMethod !== 'GET') {
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

    console.log(`[MEMORY] Fetching exact memory: ${id}`);

    const result = await getMemoryById(id, { apiKey, timeout: 5000 });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('[MEMORY] Error fetching memory:', error);
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
