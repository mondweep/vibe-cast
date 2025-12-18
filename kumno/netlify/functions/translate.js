// Netlify Function for Google Cloud Translation API
// API key stored in Netlify Environment Variables (GOOGLE_TRANSLATE_API_KEY)

export async function handler(event) {
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
        body: JSON.stringify({ error: 'Translation service not configured' }),
      };
    }

    // Call Google Cloud Translation API
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
          target: 'kha', // Khasi language code
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Translate API error:', errorData);

      // If Khasi isn't supported, provide a helpful message
      if (response.status === 400) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Khasi translation may not be available. Please try again later.',
            details: errorData,
          }),
        };
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Translation service error' }),
      };
    }

    const data = await response.json();

    if (data.data?.translations?.[0]?.translatedText) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          translatedText: data.data.translations[0].translatedText,
          sourceLanguage: 'en',
          targetLanguage: 'kha',
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unexpected response from translation service' }),
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
