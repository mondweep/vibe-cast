/**
 * Test script for Intake Agent
 * Usage: npx ts-node scripts/test-intake-agent.ts
 */

import fs from 'fs';
import path from 'path';
import { getTickets } from '../lib/db';
import { classifyTicket } from '../agents/intake-agent';

async function main() {
  console.log('🧪 Testing Intake Agent Classification...\n');

  try {
    // Get sample unclassified tickets
    const tickets = getTickets('new', 5, 0);

    if (tickets.length === 0) {
      console.log('❌ No unclassified tickets found. Run seed-db first.');
      return;
    }

    console.log(`Found ${tickets.length} unclassified tickets. Testing first 5...\n`);

    let correct = 0;
    let total = 0;

    for (const ticket of tickets.slice(0, 5)) {
      total++;

      console.log(`\n📋 Ticket: ${ticket.id}`);
      console.log(`   Subject: ${ticket.subject}`);

      try {
        const classification = await classifyTicket(ticket);

        console.log(`   Category: ${classification.category}`);
        console.log(`   Priority: ${classification.priority}`);
        console.log(`   Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
        console.log(`   Reasoning: ${classification.reasoning}`);

        // Load expected classification from mock data
        const ticketsData = JSON.parse(
          fs.readFileSync(path.join(process.cwd(), 'mock-data/tickets.json'), 'utf-8')
        );
        const expectedTicket = ticketsData.mockTickets.find((t: any) => t.id === ticket.id);

        if (expectedTicket && expectedTicket.expectedCategory === classification.category) {
          console.log(`   ✅ Correct category`);
          correct++;
        } else {
          console.log(`   ❌ Expected: ${expectedTicket?.expectedCategory}, Got: ${classification.category}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Results: ${correct}/${total} correct (${((correct / total) * 100).toFixed(0)}%)`);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
