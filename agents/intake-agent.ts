import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ticket, TicketClassification } from '@/lib/types';
import { updateTicket, addAgentLog, updateAgentTokens } from '@/lib/db';
import { emitEvent } from '@/lib/events';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const AGENT_ID = 'intake-agent';
const MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 15000; // 15 second timeout

/**
 * Load prompt template and system prompt
 */
function loadPrompts(): { system: string; template: string } {
  const systemPath = path.join(
    process.cwd(),
    'docs/prompts/INTAKE-CLASSIFICATION/v1.0/system-prompt.md'
  );
  const templatePath = path.join(
    process.cwd(),
    'docs/prompts/INTAKE-CLASSIFICATION/v1.0/user-template.md'
  );

  const system = fs.readFileSync(systemPath, 'utf-8');
  const template = fs.readFileSync(templatePath, 'utf-8');

  return { system, template };
}

/**
 * Build user message from template
 */
function buildUserMessage(ticket: Ticket, template: string): string {
  return template
    .replace('{customerName}', ticket.customer_name)
    .replace('{email}', ticket.email)
    .replace('{subject}', ticket.subject)
    .replace('{description}', ticket.description);
}

/**
 * Parse Gemini's response as JSON
 */
function parseClassification(response: string): {
  category: string;
  priority: string;
  reasoning: string;
  confidence: number;
} {
  try {
    // Try to parse as-is
    return JSON.parse(response);
  } catch (e) {
    // Try to extract JSON from response if it contains extra text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Invalid JSON response: ${response}`);
  }
}

/**
 * Classify a ticket using Gemini
 */
export async function classifyTicket(ticket: Ticket): Promise<TicketClassification> {
  const startTime = Date.now();

  try {
    const { system, template } = loadPrompts();
    const userMessage = buildUserMessage(ticket, template);

    console.log(`🎯 [${AGENT_ID}] Classifying ticket: ${ticket.id}`);

    const model = genAI.getGenerativeModel({ model: MODEL });

    // Create timeout promise
    const timeoutPromise: Promise<never> = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Classification timeout')), TIMEOUT_MS)
    );

    // Call Gemini API
    const responsePromise = model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${system}\n\n${userMessage}`
            }
          ]
        }
      ]
    });

    const response = await Promise.race<any>([responsePromise, timeoutPromise]);

    // Extract text from response
    const textContent = response.response.text();
    if (!textContent) {
      throw new Error('No text response from Gemini');
    }

    // Parse classification
    const parsed = parseClassification(textContent);

    // Validate classification
    if (!['billing', 'technical', 'account', 'feature-request'].includes(parsed.category)) {
      throw new Error(`Invalid category: ${parsed.category}`);
    }
    if (!['critical', 'high', 'medium', 'low'].includes(parsed.priority)) {
      throw new Error(`Invalid priority: ${parsed.priority}`);
    }
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error(`Invalid confidence: ${parsed.confidence}`);
    }

    const classification: TicketClassification = {
      ticketId: ticket.id,
      category: parsed.category as any,
      priority: parsed.priority as any,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      nextAgent: getNextAgent(parsed.category)
    };

    // Estimate tokens used (Gemini 2.0 Flash pricing: free for now)
    // Rough estimate: input ~300 tokens, output ~100 tokens
    const tokensUsed = 400;
    const elapsedMs = Date.now() - startTime;

    // Log classification
    addAgentLog({
      ticketId: ticket.id,
      agentId: AGENT_ID,
      action: 'classified',
      reasoning: `Classified as ${classification.category} (${classification.priority}) with ${(classification.confidence * 100).toFixed(0)}% confidence`,
      tokensUsed
    });

    // Update cost tracking (Gemini 2.0 Flash is free tier)
    updateAgentTokens(AGENT_ID, tokensUsed);

    // Update ticket with classification
    updateTicket(ticket.id, {
      category: classification.category,
      priority: classification.priority,
      status: 'classified'
    });

    // Emit event
    emitEvent('ticket.classified', {
      ticketId: ticket.id,
      agentId: AGENT_ID,
      timestamp: new Date().toISOString(),
      data: classification
    });

    console.log(`✅ [${AGENT_ID}] Classified in ${elapsedMs}ms`, {
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence,
      tokens: tokensUsed
    });

    return classification;
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`❌ [${AGENT_ID}] Classification failed after ${elapsedMs}ms:`, error);

    // Fallback classification for errors
    const fallback: TicketClassification = {
      ticketId: ticket.id,
      category: 'technical',
      priority: 'medium',
      reasoning: 'Automatic classification failed; assigned to technical for human review',
      confidence: 0.3,
      nextAgent: 'technical-specialist'
    };

    // Log the error
    addAgentLog({
      ticketId: ticket.id,
      agentId: AGENT_ID,
      action: 'classification_failed',
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: 0
    });

    // Update ticket for escalation
    updateTicket(ticket.id, {
      category: fallback.category,
      priority: fallback.priority,
      status: 'classified'
    });

    // Emit escalation event for low confidence
    emitEvent('ticket.escalated', {
      ticketId: ticket.id,
      agentId: AGENT_ID,
      timestamp: new Date().toISOString(),
      data: {
        escalationReason: 'Classification failed; requires human review'
      }
    });

    return fallback;
  }
}

/**
 * Determine next agent based on category
 */
function getNextAgent(category: string): string {
  const agentMap: { [key: string]: string } = {
    'billing': 'billing-specialist',
    'technical': 'technical-specialist',
    'account': 'account-manager',
    'feature-request': 'escalation-manager'
  };
  return agentMap[category] || 'escalation-manager';
}

/**
 * Batch classify multiple tickets
 */
export async function classifyTickets(tickets: Ticket[]): Promise<TicketClassification[]> {
  console.log(`📦 [${AGENT_ID}] Batch classifying ${tickets.length} tickets`);

  const results: TicketClassification[] = [];

  // Process sequentially to avoid rate limits
  for (const ticket of tickets) {
    try {
      const classification = await classifyTicket(ticket);
      results.push(classification);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to classify ticket ${ticket.id}:`, error);
    }
  }

  console.log(`✅ [${AGENT_ID}] Batch classification complete: ${results.length}/${tickets.length} successful`);
  return results;
}
