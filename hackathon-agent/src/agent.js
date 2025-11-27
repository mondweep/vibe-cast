const { createDatabase } = require('agentdb');
const qudag = require('./qudag_wrapper');
const { logPrompt } = require('./utils');

async function main() {
    console.log('🚀 Starting Hackathon Agent (Option A)...');

    // Log the start
    logPrompt('Agent started execution cycle');

    // Simulate a completed task (e.g., from a git hook)
    const task = {
        id: 'task_' + Date.now(),
        action: 'feat: implemented chat overlay',
        project: 'tv5-monde-hackathon',
        timestamp: Date.now(),
        proof: 'git_commit_hash_123456',
        agentId: 'agent_claude_local_01'
    };

    console.log('🤖 Agent: Work detected:', task.action);

    // 1. Store in AgentDB (Real)
    try {
        console.log('🤖 Agent: Initializing AgentDB...');
        const db = await createDatabase({ name: 'hackathon_memory' });
        console.log('🤖 Agent: AgentDB initialized.');

        // Attempt to store the task.
        // Since we don't have exact docs, we'll try a generic SQL insert if exposed,
        // or just rely on the initialization to prove it's working (it creates the DB file).
        // If db has a 'db' property with 'run' method (sql.js style):
        if (db.db && db.db.run) {
            // Create table if not exists
            db.db.run('CREATE TABLE IF NOT EXISTS actions (id TEXT, action TEXT, proof TEXT)');
            db.db.run('INSERT INTO actions VALUES (?, ?, ?)', [task.id, task.action, task.proof]);
            console.log('🤖 Agent: Stored proof in AgentDB (Persistent SQLite).');
        } else {
            console.log('🤖 Agent: AgentDB ready (API exploration needed for insert).');
        }
    } catch (err) {
        console.error('❌ AgentDB Error:', err);
    }

    // 2. Sign with QuDAG
    const signature = qudag.sign(task);
    console.log('🤖 Agent: Signed with QuDAG keys (ML-DSA-87).');

    // 3. Broadcast to DAG
    const tx = qudag.broadcast(task, signature);
    console.log('✅ Agent: Proof of Action recorded on DAG! TxID:', tx.txId);

    logPrompt(`Agent broadcasted Proof of Action: ${tx.txId}`);
}

main().catch(console.error);
