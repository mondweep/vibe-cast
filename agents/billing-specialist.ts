import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ticket, BillingResolution } from '@/lib/types';
import { updateTicket, addAgentLog, updateAgentTokens } from '@/lib/db';
import { emitEvent } from '@/lib/events';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const AGENT_ID = 'billing-specialist';
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const TIMEOUT_MS = 15000;

/**
 * Mock customer lookup (would be real DB in production)
 */
function getCustomerData(email: string): any {
  const customersPath = path.join(process.cwd(), 'mock-data', 'customers.json');
  const data = JSON.parse(fs.readFileSync(customersPath, 'utf-8'));

  return data.mockCustomers.find((c: any) => c.email === email) || {
    email,
    name: 'Unknown Customer',
    subscriptionTier: 'unknown',
    monthlyBudget: 0,
    accountBalance: 0,
    recentCharges: []
  };
}

/**
 * Build user message with customer data
 */
function buildUserMessage(ticket: Ticket, template: string): string {
  const customer = getCustomerData(ticket.email);

  const recentChargesStr = customer.recentCharges
    .map((c: any) => `${c.date}: $${c.amount} - ${c.description}`)
    .join(', ');

  return template
    .replace('{ticketId}', ticket.id)
    .replace('{customerName}', ticket.customer_name)
    .replace('{email}', ticket.email)
    .replace('{subject}', ticket.subject)
    .replace('{description}', ticket.description)
    .replace('{subscriptionTier}', customer.subscriptionTier)
    .replace('{subscriptionCost}', customer.monthlyBudget)
    .replace('{accountCreated}', customer.accountCreated)
    .replace('{recentCharges}', recentChargesStr || 'None');
}

/**
 * Load prompts
 */
function loadPrompts(): { system: string; template: string } {
  const systemPath = path.join(
    process.cwd(),
    'docs/prompts/BILLING-SPECIALIST/v1.0/system-prompt.md'
  );
  const templatePath = path.join(
    process.cwd(),
    'docs/prompts/BILLING-SPECIALIST/v1.0/user-template.md'
  );

  const system = fs.readFileSync(systemPath, 'utf-8');
  const template = fs.readFileSync(templatePath, 'utf-8');

  return { system, template };
}

/**
 * Parse resolution from response
 */
function parseResolution(response: string): BillingResolution {
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
 * Resolve a billing ticket
 */
export async function resolveBillingTicket(ticket: Ticket): Promise<BillingResolution> {
  const startTime = Date.now();

  // Skip if not a billing ticket
  if (ticket.category !== 'billing') {
    throw new Error(`Ticket is not a billing issue: category=${ticket.category}`);
  }

  try {
    const { system, template } = loadPrompts();
    const userMessage = buildUserMessage(ticket, template);

    console.log(`💰 [${AGENT_ID}] Resolving billing ticket: ${ticket.id}`);

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

    // Validate response
    if (!['refund', 'credit', 'explanation', 'no-action'].includes(parsed.customerImpact)) {
      throw new Error(`Invalid customerImpact: ${parsed.customerImpact}`);
    }

    const resolution: BillingResolution = {
      ticketId: ticket.id,
      resolution: parsed.resolution,
      actionsTaken: parsed.actionsTaken || [],
      customerImpact: parsed.customerImpact,
      amount: parsed.amount,
      escalationRequired: parsed.escalationRequired || false,
      escalationReason: parsed.escalationReason
    };

    // Read real token usage from the Gemini API response
    const usage = response.response.usageMetadata;
    const tokensUsed = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0) || 500;
    const elapsedMs = Date.now() - startTime;

    // Log resolution
    addAgentLog({
      ticketId: ticket.id,
      agentId: AGENT_ID,
      action: 'resolved',
      reasoning: `Resolved as ${resolution.customerImpact}. ${resolution.escalationRequired ? 'Escalated.' : 'Self-resolved.'}`,
      tokensUsed
    });

    // Update cost tracking
    updateAgentTokens(AGENT_ID, tokensUsed);

    // Update ticket
    const status = resolution.escalationRequired ? 'escalated' : 'resolved';
    updateTicket(ticket.id, {
      status,
      resolution: resolution.resolution,
      resolved_at: new Date().toISOString()
    });

    // Emit event
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
      customerImpact: resolution.customerImpact,
      escalated: resolution.escalationRequired,
      tokens: tokensUsed
    });

    return resolution;
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`❌ [${AGENT_ID}] Resolution failed after ${elapsedMs}ms:`, error);

    // Fallback
    const fallback: BillingResolution = {
      ticketId: ticket.id,
      resolution: 'Unable to automatically resolve. Escalating to billing team.',
      actionsTaken: ['escalated'],
      customerImpact: 'no-action',
      escalationRequired: true,
      escalationReason: `Resolution processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
