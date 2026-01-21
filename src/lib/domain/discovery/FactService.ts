import { GoogleGenerativeAI } from '@google/generative-ai';

export class FactService {
    // TODO: Move to Env
    private static readonly API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'TEST_KEY';

    static async generateFact(locationName: string): Promise<string> {
        const genAI = new GoogleGenerativeAI(this.API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            You are Driftwise, a serendipitous local historian and raconteur.
            The user is driving through: "${locationName}".
            
            Find a SINGLE, fascinating, specific historical fact or story about this precise location.
            
            STRICT RULES:
            1. NO generic tourism (e.g., "This church was built in 1850").
            2. FOCUS on: Unusual events, finding of artifacts, literary connections, battles, or eccentric local characters.
            3. STYLE: Conversational, intriguing, like a radio host telling a secret.
            4. LENGTH: 1-2 sentences maximum. Short enough to be read while driving.
            
            Example of GOOD: "Just behind this hedge, a Roman hoard of 30,000 coins was found in 1996 by a dog walker."
            Example of BAD: "St Mary's Church is a Grade II listed building with a Norman tower."
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (e) {
            console.error('AI Error', e);
            return 'I couldn\'t find a story for this spot right now.';
        }
    }
}
