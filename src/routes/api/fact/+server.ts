import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
// import { env } from '$env/dynamic/private'; // or use process.env in some adapters
// For simplicity in V1 with Netlify adapter + Vite, we can access the same Env vars if exposed, 
// OR better: rely on a separate private key if the user sets 'GEMINI_API_KEY'.
// Let's check VITE_GEMINI_API_KEY first for backward compat.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

export async function POST({ request }) {
    try {
        const { location } = await request.json();

        if (!API_KEY) {
            return json({ error: 'Server API Key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        // Paid Tier Model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const prompt = `
            You are Driftwise, a serendipitous local historian and raconteur.
            The user is driving through: "${location}".
            
            Find a SINGLE, fascinating, specific historical fact or story about this precise location.
            
            STRICT RULES:
            1. NO generic tourism (e.g., "This church was built in 1850").
            2. FOCUS on: Unusual events, finding of artifacts, literary connections, battles, or eccentric local characters.
            3. STYLE: Conversational, intriguing, like a radio host telling a secret.
            4. LENGTH: 1-2 sentences maximum. Short enough to be read while driving.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return json({ fact: text });

    } catch (error) {
        console.error('Server Fact Error:', error);
        return json({ error: 'Failed to generate fact' }, { status: 500 });
    }
}
