import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { VectorDb: VectorDB } = require('../index.cjs');

// Simple "Semantic" Embedding for Demo
// Maps keywords to vector dimensions to simulate semantic understanding
function getTransactionEmbedding(text) {
    const dim = 10; // Small dimension for demo
    const vector = new Float32Array(dim);
    const lowerText = text.toLowerCase();

    // Define some "concepts" and their dimensions
    const concepts = {
        'food': 0, 'coffee': 0, 'restaurant': 0, 'grocery': 0, 'lunch': 0, 'dinner': 0,
        'transport': 1, 'uber': 1, 'taxi': 1, 'bus': 1, 'train': 1, 'gas': 1,
        'housing': 2, 'rent': 2, 'mortgage': 2, 'utilities': 2, 'electric': 2,
        'income': 3, 'salary': 3, 'bonus': 3, 'deposit': 3,
        'crypto': 4, 'bitcoin': 4, 'btc': 4, 'eth': 4, 'ethereum': 4, 'coinbase': 4,
        'tech': 5, 'software': 5, 'computer': 5, 'cloud': 5, 'aws': 5,
        'entertainment': 6, 'movie': 6, 'netflix': 6, 'game': 6, 'spotify': 6,
        'shopping': 7, 'amazon': 7, 'clothes': 7, 'shoes': 7,
        'health': 8, 'doctor': 8, 'gym': 8, 'pharmacy': 8,
        'education': 9, 'school': 9, 'course': 9, 'book': 9
    };

    // Simple bag-of-words with concept mapping
    const words = lowerText.split(/\W+/);
    let foundConcept = false;

    for (const word of words) {
        if (concepts[word] !== undefined) {
            vector[concepts[word]] += 1.0;
            foundConcept = true;
        }
    }

    // If no known concepts, hash the words into random dimensions (fallback)
    if (!foundConcept) {
        for (const word of words) {
            if (word.length > 0) {
                let hash = 0;
                for (let i = 0; i < word.length; i++) {
                    hash = ((hash << 5) - hash) + word.charCodeAt(i);
                    hash |= 0;
                }
                const idx = Math.abs(hash) % dim;
                vector[idx] += 0.5;
            }
        }
    }

    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
        for (let i = 0; i < dim; i++) {
            vector[i] /= norm;
        }
    }

    return vector;
}

async function main() {
    console.log('🚀 Agentic Accounting: Semantic Transaction Search Demo\n');

    // Initialize Vector DB
    const db = new VectorDB({
        dimensions: 10,
        distanceMetric: 'Cosine',
        storagePath: './transactions.db'
    });

    console.log('✅ Initialized Transaction Vector DB');

    // Sample Transactions
    const transactions = [
        { id: 'tx1', desc: 'Starbucks Coffee', amount: -5.50, date: '2023-10-01' },
        { id: 'tx2', desc: 'Uber Ride to Airport', amount: -45.00, date: '2023-10-02' },
        { id: 'tx3', desc: 'Monthly Rent Payment', amount: -2000.00, date: '2023-10-01' },
        { id: 'tx4', desc: 'Coinbase BTC Purchase', amount: -500.00, date: '2023-10-03' },
        { id: 'tx5', desc: 'Whole Foods Market', amount: -120.35, date: '2023-10-04' },
        { id: 'tx6', desc: 'Netflix Subscription', amount: -15.99, date: '2023-10-05' },
        { id: 'tx7', desc: 'Salary Deposit', amount: 5000.00, date: '2023-10-15' },
        { id: 'tx8', desc: 'AWS Cloud Services', amount: -35.00, date: '2023-10-06' },
        { id: 'tx9', desc: 'CVS Pharmacy', amount: -22.50, date: '2023-10-07' },
        { id: 'tx10', desc: 'Sold ETH on Kraken', amount: 1200.00, date: '2023-10-08' }
    ];

    // Index Transactions
    console.log('\n📝 Indexing transactions...');
    const entries = transactions.map(tx => ({
        id: tx.id,
        vector: getTransactionEmbedding(tx.desc),
        metadata: tx
    }));

    await db.insertBatch(entries);
    console.log(`  Indexed ${entries.length} transactions`);

    // Perform Semantic Searches
    const queries = [
        'food and drinks',
        'transportation costs',
        'crypto investments',
        'housing expenses',
        'entertainment'
    ];

    console.log('\n🔍 Performing Semantic Searches:\n');

    for (const query of queries) {
        console.log(`Query: "${query}"`);
        const vector = getTransactionEmbedding(query);
        const results = await db.search({ vector, k: 2 });

        results.forEach(r => {
            const tx = r.metadata;
            console.log(`  - [${r.score.toFixed(4)}] ${tx.desc} ($${tx.amount})`);
        });
        console.log('');
    }

    // Cleanup
    // fs.unlinkSync('./transactions.db'); // Optional
}

main().catch(console.error);
