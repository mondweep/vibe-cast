import { GoogleGenerativeAI } from '@google/generative-ai';

export class FactService {
    static async generateFact(locationName: string): Promise<string> {
        console.log('[Driftwise] Requesting fact from Server Proxy...');

        try {
            const response = await fetch('/api/fact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ location: locationName })
            });

            if (!response.ok) {
                if (response.status === 429) return 'Quota Exceeded (Server).';
                return 'Server error generating fact.';
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            return data.fact;

        } catch (e) {
            console.error('FactService Error', e);
            return 'I couldn\'t find a story for this spot right now (Network Error).';
        }
    }
}
