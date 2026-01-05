// Netlify Function for Google Cloud Translation API
// API key stored in Netlify Environment Variables (GOOGLE_TRANSLATE_API_KEY)

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { text } = JSON.parse(event.body);

    if (!text || typeof text !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' }),
      };
    }

    // Limit text length for cost control
    if (text.length > 500) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text too long. Maximum 500 characters.' }),
      };
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Translation service not configured. Please add GOOGLE_TRANSLATE_API_KEY environment variable.' }),
      };
    }

    // Call Google Cloud Translation API
    // Assamese language code is "as"
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: 'as', // Assamese language code
          format: 'text',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Google Translate API error:', JSON.stringify(data));

      // Extract meaningful error message
      const googleError = data?.error?.message || 'Unknown API error';
      const errorCode = data?.error?.code || response.status;

      // Common error cases
      if (errorCode === 400 && googleError.includes('Invalid Value')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Assamese (as) language translation failed. The static phrasebook is still available offline.',
          }),
        };
      }

      if (errorCode === 403) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'API access denied. Please check: 1) API key is valid, 2) Cloud Translation API is enabled, 3) Billing is set up.',
          }),
        };
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: `Translation failed: ${googleError}`,
          code: errorCode,
        }),
      };
    }

    if (data.data?.translations?.[0]?.translatedText) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          translatedText: data.data.translations[0].translatedText,
          sourceLanguage: 'en',
          targetLanguage: 'as',
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unexpected response format from translation service' }),
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Internal server error: ${error.message}` }),
    };
  }
}
