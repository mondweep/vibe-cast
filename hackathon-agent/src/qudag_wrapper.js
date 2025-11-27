const { execSync } = require('child_process');

function execute(command) {
    try {
        // Execute qudag command
        // We assume 'qudag' is in the PATH. If not, we might need full path ~/.cargo/bin/qudag
        const output = execSync(`qudag ${command}`, { encoding: 'utf-8', stdio: 'pipe' });
        return output.trim();
    } catch (error) {
        // If command fails, log stderr
        const stderr = error.stderr ? error.stderr.toString() : error.message;
        console.error(`[QuDAG CLI Error] Command: qudag ${command}`);
        console.error(`[QuDAG CLI Error] Output: ${stderr}`);

        // Fallback for demo if CLI is not actually installed/working yet
        if (stderr.includes('command not found') || stderr.includes('ENOENT')) {
            console.warn('[QuDAG Wrapper] CLI not found. Falling back to mock implementation for demo.');
            return mockExecute(command);
        }
        throw new Error(stderr);
    }
}

function mockExecute(command) {
    if (command.startsWith('crypto sign')) {
        return "Signature: mock_sig_" + Date.now();
    }
    if (command.startsWith('dag add')) {
        return "TxID: dag_mock_" + Date.now();
    }
    return "Mock Output";
}

module.exports = {
    sign: (data) => {
        console.log(`[QuDAG Wrapper] Signing data with CLI...`);
        const dataStr = JSON.stringify(data).replace(/"/g, '\\"'); // Simple escaping
        const output = execute(`crypto sign --data "${dataStr}"`);

        // Parse output (heuristic)
        const match = output.match(/Signature:\s*(\S+)/i);
        const signature = match ? match[1] : output;

        return {
            signature: signature,
            algorithm: 'ML-DSA-87'
        };
    },
    broadcast: (data, signature) => {
        console.log(`[QuDAG Wrapper] Broadcasting to DAG...`);
        const dataStr = JSON.stringify(data).replace(/"/g, '\\"');
        const output = execute(`dag add --data "${dataStr}" --signature "${signature.signature}"`);

        const match = output.match(/TxID:\s*(\S+)/i);
        const txId = match ? match[1] : 'unknown';

        return {
            txId: txId,
            raw: output
        };
    }
};
