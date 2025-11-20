import { Transaction, TransactionType } from './core/src/types/index.js';
import { AccountingMethod, TaxLot, LotStatus } from './core/src/types/tax-lot.js';
import { DecimalMath } from './core/src/utils/decimal.js';
import type Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

export class AccountingEngine {
    private lots: TaxLot[] = [];

    constructor() { }

    /**
     * Process a list of transactions using a specific accounting method.
     * Returns the final balance and total realized gain.
     */
    process(transactions: Transaction[], method: AccountingMethod): { balance: Decimal, realizedGain: Decimal, lots: TaxLot[] } {
        // Reset state for this run
        this.lots = [];
        let balance = DecimalMath.from(0);
        let realizedGain = DecimalMath.from(0);

        // Sort transactions by date
        const sortedTx = [...transactions].sort((a, b) =>
            (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0)
        );

        for (const tx of sortedTx) {
            if (tx.type === TransactionType.BUY) {
                this.handleBuy(tx, method);
                balance = DecimalMath.add(balance, tx.quantity);
            } else if (tx.type === TransactionType.SELL) {
                const gain = this.handleSell(tx, method);
                realizedGain = DecimalMath.add(realizedGain, gain);
                balance = DecimalMath.subtract(balance, tx.quantity);
            }
        }

        return { balance, realizedGain, lots: this.lots };
    }

    private handleBuy(tx: Transaction, method: AccountingMethod) {
        const lot: TaxLot = {
            id: uuidv4(),
            transactionId: tx.id,
            asset: tx.asset,
            acquiredDate: tx.timestamp || new Date(),
            quantity: tx.quantity,
            originalQuantity: tx.quantity,
            costBasis: DecimalMath.multiply(tx.quantity, tx.price), // Simplified: ignoring fees for now
            unitCostBasis: tx.price,
            currency: tx.currency,
            source: tx.source,
            method: method,
            disposals: [],
            status: LotStatus.OPEN
        };
        this.lots.push(lot);
    }

    private handleSell(tx: Transaction, method: AccountingMethod): Decimal {
        let remainingToSell = tx.quantity;
        let totalCostBasis = DecimalMath.from(0);
        let totalProceeds = DecimalMath.multiply(tx.quantity, tx.price);

        // Select lots based on method
        const availableLots = this.getAvailableLots(method);

        for (const lot of availableLots) {
            if (DecimalMath.isZero(remainingToSell)) break;

            const take = DecimalMath.min(remainingToSell, lot.quantity);

            // Calculate cost basis for the portion taken
            const costBasisChunk = DecimalMath.multiply(take, lot.unitCostBasis);
            totalCostBasis = DecimalMath.add(totalCostBasis, costBasisChunk);

            // Update lot
            lot.quantity = DecimalMath.subtract(lot.quantity, take);
            if (DecimalMath.isZero(lot.quantity)) {
                lot.status = LotStatus.CLOSED;
            } else {
                lot.status = LotStatus.PARTIAL;
            }

            remainingToSell = DecimalMath.subtract(remainingToSell, take);
        }

        if (DecimalMath.isPositive(remainingToSell)) {
            console.warn(`⚠️ Warning: Sold more than available! Negative balance not fully handled in this demo.`);
        }

        return DecimalMath.subtract(totalProceeds, totalCostBasis);
    }

    private getAvailableLots(method: AccountingMethod): TaxLot[] {
        // Filter for open lots
        const openLots = this.lots.filter(l => l.status !== LotStatus.CLOSED && DecimalMath.isPositive(l.quantity));

        switch (method) {
            case AccountingMethod.FIFO:
                // Oldest first
                return openLots.sort((a, b) => a.acquiredDate.getTime() - b.acquiredDate.getTime());

            case AccountingMethod.LIFO:
                // Newest first
                return openLots.sort((a, b) => b.acquiredDate.getTime() - a.acquiredDate.getTime());

            case AccountingMethod.HIFO:
                // Highest cost first
                return openLots.sort((a, b) => DecimalMath.compare(b.unitCostBasis, a.unitCostBasis));

            default:
                return openLots;
        }
    }
}
