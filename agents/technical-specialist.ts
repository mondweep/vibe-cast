import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ticket, TechnicalResolution } from '@/lib/types';
import { updateTicket, addAgentLog, updateAgentTokens } from '@/lib/db';
import { emitEvent } from '@/lib/events';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const AGENT_ID = 'technical-specialist';
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const TIMEOUT_MS = 15000;

/**
 * Load prompts
 */
function loadPrompts(): { system: string; template: string } {
  const systemPath = path.join(
    process.cwd(),
    'docs/prompts/TECHNICAL-SPECIALIST/v1.0/system-prompt.md'
  );
  const templatePath = path.join(
    process.cwd(),
    'docs/prompts/TECHNICAL-SPECIALIST/v1.0/user-template.md'
  );

  const system = fs.readFileSync(systemPath, 'utf-8');
  const template = fs.readFileSync(templatePath, 'utf-8');

  return { system, template };
}

/**
 * Build user message
 */
function buildUserMessage(ticket: Ticket, template: string): string {
  return template
    .replace('{ticketId}', ticket.id)
    .replace('{customerName}', ticket.customer_name)
    .replace('{subject}', ticket.subject)
    .replace('{description}', ticket.description);
}

/**
 * Parse resolution
 */
function parseResolution(response: string): TechnicalResolution {
  try {
    return JSON.parse(response);
  } catch (e) {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Invalid JSON response: ${response}`);
  }
}

/**
 * Resolve a technical ticket
 */
export async function resolveTechnicalTicket(ticket: Ticket): Promise<TechnicalResolution> {
  const startTime = Date.now();

  if (ticket.category !== 'technical') {
    throw new Error(`Ticket is not technical: category=${ticket.category}`);
  }

  try {
    const { system, template } = loadPrompts();
    const userMessage = buildUserMessage(ticket, template);

    console.log(`🔧 [${AGENT_ID}] Resolving technical ticket: ${ticket.id}`);

    const model = genAI.getGenerativeModel({ model: MODEL });

    const timeoutPromise: Promise<never> = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Resolution timeout')), TIMEOUT_MS)
    );

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

    const textContent = response.response.text();
    if (!textContent) {
      throw new Error('No text response from Gemini');
    }

    const parsed = parseResolution(textContent);

    const resolution: TechnicalResolution = {
      ticketId: ticket.id,
      diagnosis: parsed.diagnosis,
      steps: parsed.steps || [],
      resourceLinks: parsed.resourceLinks || [],
      isKnownIssue: parsed.isKnownIssue || false,
      escalationRequired: parsed.escalationRequired || false,
      escalationReason: parsed.escalationReason
    };

    // Read real token usage from the Gemini API response
    const usage = response.response.usageMetadata;
    const tokensUsed = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0) || 600;
    const elapsedMs = Date.now() - startTime;

    addAgentLog({
      ticketId: ticket.id,
      agentId: AGENT_ID,
      action: 'resolved',
      reasoning: `${resolution.diagnosis}. ${resolution.escalationRequired ? 'Escalated to engineering.' : 'Provided troubleshooting steps.'}`,
      tokensUsed
    });

    updateAgentTokens(AGENT_ID, tokensUsed);

    const status = resolution.escalationRequired ? 'escalated' : 'resolved';
    updateTicket(ticket.id, {
      status,
      resolution: resolution.diagnosis,
      resolved_at: new Date().toISOString()
    });

    if (resolution.escalationRequired) {
      emitEvent('ticket.escalated', {
        ticketId: ticket.id,
        agentId: AGENT_ID,
        timestamp: new Date().toISOString(),
        data: {
          escalationReason: resolution.escalationReason
        }
      });
    } else {
      emitEvent('ticket.resolved', {
        ticketId: ticket.id,
        agentId: AGENT_ID,
        timestamp: new Date().toISOString(),
        data: resolution
      });
    }

    console.log(`✅ [${AGENT_ID}] Resolved in ${elapsedMs}ms`, {
      isKnown: resolution.isKnownIssue,
      escalated: resolution.escalationRequired,
      tokens: tokensUsed
    });

    return resolution;
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`❌ [${AGENT_ID}] Resolution failed after ${elapsedMs}ms:`, error);

    const fallback: TechnicalResolution = {
      ticketId: ticket.id,
      diagnosis: 'Unable to diagnose. Escalating to engineering team.',
      steps: [],
      resourceLinks: [],
      isKnownIssue: false,
      escalationRequired: true,
      escalationReason: `Troubleshooting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };

    addAgentLog({
      ticketId: ticket.id,
      agentId: AGENT_ID,
      action: 'resolution_failed',
      reasoning: error instanceof Error ? error.message : 'Unknown error',
      tokensUsed: 0
    });

    updateTicket(ticket.id, {
      status: 'escalated'
    });

    emitEvent('ticket.escalated', {
      ticketId: ticket.id,
      agentId: AGENT_ID,
      timestamp: new Date().toISOString(),
      data: {
        escalationReason: fallback.escalationReason
      }
    });

    return fallback;
  }
}
