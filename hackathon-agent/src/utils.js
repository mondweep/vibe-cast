const fs = require('fs');
const path = require('path');

function logPrompt(promptText) {
    const logFile = path.join(__dirname, '../../PROMPTS-USED.md');
    const timestamp = new Date().toISOString();
    // Simple append for demonstration
    const entry = `\n- **Agent Action**: "${promptText}" (*${timestamp}*)\n`;

    try {
        fs.appendFileSync(logFile, entry);
        console.log('📝 Prompt logged to PROMPTS-USED.md');
    } catch (err) {
        console.error('Failed to log prompt:', err);
    }
}

module.exports = { logPrompt };
