import { AccountantAgent } from './agent.js';
import { DecimalMath } from './core/src/utils/decimal.js';
import { TransactionType } from './core/src/types/index.js';

import { AccountingEngine } from './engine.js';
import { AccountingMethod } from './core/src/types/tax-lot.js';

async function runDemo() {
    console.log('🤖 Agentic Accounting System Demo (Phase 2)');
    console.log('===========================================');

    const agent = new AccountantAgent();
    const engine = new AccountingEngine();

    const input = `
    Bought 1.0 BTC at 40000
    Bought 0.5 BTC at 42000
    Bought 0.5 BTC at 38000
    Sold 0.8 BTC at 45000
  `;

    console.log('\n📝 Processing Natural Language Input:');
    console.log(input.trim());

    const transactions = await agent.processNaturalLanguage(input);

    console.log(`\n✅ Extracted ${transactions.length} transactions:`);
    transactions.forEach(tx => {
        console.log(`- ${tx.type} ${tx.quantity.toString()} ${tx.asset} @ $${tx.price.toString()}`);
    });

    console.log('\n📊 Comparative Analysis:');
    console.log('--------------------------------------------------');
    console.log('| Method | Realized Gain | Ending Balance | Note   |');
    console.log('|--------|---------------|----------------|--------|');

    const methods = [AccountingMethod.FIFO, AccountingMethod.LIFO, AccountingMethod.HIFO];

    for (const method of methods) {
        const result = engine.process(transactions, method);

        let note = '';
        if (method === AccountingMethod.FIFO) note = 'Sells oldest (40k)';
        if (method === AccountingMethod.LIFO) note = 'Sells newest (38k)';
        if (method === AccountingMethod.HIFO) note = 'Sells highest (42k+40k)';

        console.log(`| ${method.padEnd(6)} | $${result.realizedGain.toFixed(2).padEnd(12)} | ${result.balance.toFixed(4).padEnd(14)} | ${note.padEnd(6)} |`);
    }
    console.log('--------------------------------------------------');
}

runDemo().catch(console.error);
