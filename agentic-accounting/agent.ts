import { Transaction, TransactionType } from './core/src/types/index.js';
import { DecimalMath } from './core/src/utils/decimal.js';
import { v4 as uuidv4 } from 'uuid';

export class AccountantAgent {
    /**
     * Parse natural language input into a list of transactions.
     * In a real system, this would call an LLM.
     * Here, we use regex for demonstration.
     */
    async processNaturalLanguage(input: string): Promise<Transaction[]> {
        const lines = input.split('\n').filter(line => line.trim().length > 0);
        const transactions: Transaction[] = [];

        let currentTime = new Date();

        for (const line of lines) {
            // Increment time by 1 second for each transaction to preserve order
            currentTime = new Date(currentTime.getTime() + 1000);
            const tx = this.parseLine(line, currentTime);
            if (tx) {
                transactions.push(tx);
            }
        }

        return transactions;
    }

    private parseLine(line: string, timestamp: Date): Transaction | null {
        // Regex for "Bought <amount> <asset> at <price>"
        // Example: "Bought 1.5 BTC at 45000"
        const buyRegex = /Bought\s+([\d.]+)\s+(\w+)\s+at\s+([\d.]+)/i;
        const sellRegex = /Sold\s+([\d.]+)\s+(\w+)\s+at\s+([\d.]+)/i;

        let match = line.match(buyRegex);
        if (match) {
            return {
                id: uuidv4(),
                timestamp: timestamp, // Use provided timestamp
                type: TransactionType.BUY,
                quantity: DecimalMath.from(match[1]),
                asset: match[2].toUpperCase(),
                price: DecimalMath.from(match[3]),
                currency: 'USD',
                fees: DecimalMath.from(0), // Simplified
                taxable: true,
                source: 'Manual Input',
                sourceId: uuidv4(),
                metadata: { originalText: line }
            };
        }

        match = line.match(sellRegex);
        if (match) {
            return {
                id: uuidv4(),
                timestamp: timestamp,
                type: TransactionType.SELL,
                quantity: DecimalMath.from(match[1]),
                asset: match[2].toUpperCase(),
                price: DecimalMath.from(match[3]),
                currency: 'USD',
                fees: DecimalMath.from(0),
                taxable: true,
                source: 'Manual Input',
                sourceId: uuidv4(),
                metadata: { originalText: line }
            };
        }

        return null;
    }
}
