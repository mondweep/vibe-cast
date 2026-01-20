
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(request: Request) {
    try {
        const { fleetStats, alerts } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { success: false, error: 'API Key not configured' },
                { status: 500 }
            );
        }

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

    } catch (error) {
        console.error('Gemini API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate report' },
            { status: 500 }
        );
    }
}
