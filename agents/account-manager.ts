import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ticket, AccountResolution } from '@/lib/types';
import { updateTicket, addAgentLog, updateAgentTokens } from '@/lib/db';
import { emitEvent } from '@/lib/events';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const AGENT_ID = 'account-manager';
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const TIMEOUT_MS = 15000;

/**
 * Account resolution system prompt
 */
const SYSTEM_PROMPT = `You are an expert account manager. Your role is to resolve account-related issues: login failures, password resets, permissions, access, and security.

## Your Capabilities
- Reset passwords and access
- Update account settings
- Manage team permissions
- Detect security issues
- Verify account ownership
- Handle account recovery

## Common Issues

### Login Failures (403/401)
- Verify account status is active
- Check if email is verified
- Suggest password reset if needed
- Check for IP/geographic blocks
- Suggest clearing cache/cookies

### Password Resets
- Request email verification
- Provide reset link
- Explain expiration time
- Guide through new password setup

### Permission Issues
- Verify team membership
- Check feature access based on plan
- Grant/revoke permissions
- Explain plan limitations

### Account Recovery
- Ask for verification (email, phone)
- Check account status
- Restore deleted data if within recovery window
- Document reason for recovery

### Security Concerns
- Do NOT provide account access to unverified users
- Escalate if potential breach
- Log security events
- Ask for verification

## Output Format

Return JSON:

\`\`\`json
{
  "ticketId": "ticket-001",
  "actionTaken": "Password reset link sent to registered email",
  "accountUpdated": true,
  "securityIssueDetected": false,
  "escalationRequired": false
}
\`\`\`

## Rules
1. Always verify account ownership before making changes
2. Escalate security concerns immediately
3. Document all account changes
4. Provide clear next steps to customer
5. Never share sensitive account details`;

/**
 * Build user message
 */
function buildUserMessage(ticket: Ticket): string {
  return `Resolve this account issue:

Ticket ID: ${ticket.id}
Customer: ${ticket.customer_name}
Subject: ${ticket.subject}
Description: ${ticket.description}

Return only valid JSON. No extra text.`;
}

/**
 * Parse response
 */
function parseResolution(response: string): AccountResolution {
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
 * Resolve account ticket
 */
export async function resolveAccountTicket(ticket: Ticket): Promise<AccountResolution> {
  const startTime = Date.now();

  if (ticket.category !== 'account') {
    throw new Error(`Ticket is not account-related: category=${ticket.category}`);
  }

  try {
    const userMessage = buildUserMessage(ticket);

    console.log(`👤 [${AGENT_ID}] Resolving account ticket: ${ticket.id}`);

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
              text: `${SYSTEM_PROMPT}\n\n${userMessage}`
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

    const resolution: AccountResolution = {
      ticketId: ticket.id,
      actionTaken: parsed.actionTaken,
      accountUpdated: parsed.accountUpdated || false,
      securityIssueDetected: parsed.securityIssueDetected || false,
      escalationRequired: parsed.escalationRequired || parsed.securityIssueDetected || false
    };

    const tokensUsed = 400; // Estimate
    const elapsedMs = Date.now() - startTime;

    addAgentLog({
      ticketId: ticket.id,
      agentId: AGENT_ID,
      action: 'resolved',
      reasoning: resolution.actionTaken,
      tokensUsed
    });

    updateAgentTokens(AGENT_ID, tokensUsed);

    const status = resolution.escalationRequired ? 'escalated' : 'resolved';
    updateTicket(ticket.id, {
      status,
      resolution: resolution.actionTaken,
      resolved_at: new Date().toISOString()
    });

    if (resolution.escalationRequired) {
      emitEvent('ticket.escalated', {
        ticketId: ticket.id,
        agentId: AGENT_ID,
        timestamp: new Date().toISOString(),
        data: {
          escalationReason: resolution.securityIssueDetected ? 'Security issue detected' : 'Requires human review'
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
      accountUpdated: resolution.accountUpdated,
      escalated: resolution.escalationRequired,
      tokens: tokensUsed
    });

    return resolution;
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`❌ [${AGENT_ID}] Resolution failed after ${elapsedMs}ms:`, error);

    const fallback: AccountResolution = {
      ticketId: ticket.id,
      actionTaken: 'Account issue escalated to support team.',
      accountUpdated: false,
      securityIssueDetected: false,
      escalationRequired: true
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
        escalationReason: 'Account resolution failed'
      }
    });

    return fallback;
  }
}
