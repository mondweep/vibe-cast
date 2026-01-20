
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Force dynamic to prevent static optimization of this route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing in environment variables");
            return NextResponse.json(
                { success: false, error: 'Server configuration error: API Key missing' },
                { status: 500 }
            );
        }

        // Initialize inside handler to ensure env vars are loaded
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const { fleetStats, alerts } = await request.json();

        const prompt = `
        Act as a Senior Connectivity Analyst for a global IoT fleet.
        
        Analyze the following fleet status and provide a concise, professional executive summary.
        Focus on:
        1. Overall Health Check (based on health score: ${fleetStats.healthScore}/100)
        2. Data Consumption Trends (${fleetStats.totalData})
        3. Critical Alerts Analysis (Count: ${fleetStats.alerts})
        
        Raw Data:
        ${JSON.stringify({ fleetStats, alerts }, null, 2)}
        
        Format the response in Markdown. Keep it under 150 words. Be direct and actionable.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({ success: true, report: text });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate report' },
            { status: 500 }
        );
    }
}
