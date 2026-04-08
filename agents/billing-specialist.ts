import fs from 'fs';
import path from 'path';
import { Anthropic } from 'anthropic';
import { Ticket, BillingResolution } from '@/lib/types';
import { updateTicket, addAgentLog, updateAgentTokens } from '@/lib/db';
import { emitEvent } from '@/lib/events';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const AGENT_ID = 'billing-specialist';
const MODEL = 'claude-3-5-sonnet-20241022';
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

    const responsePromise = anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: system,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Resolution timeout')), TIMEOUT_MS)
    );

    const response = await Promise.race([responsePromise, timeoutPromise]);

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const parsed = parseResolution(textContent.text);

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

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
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
