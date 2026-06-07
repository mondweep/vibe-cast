/**
 * Developer Message Listener Hook
 * 
 * Monitors for messages from developer-w10 agent
 * Triggers test suite creation when implementation summary arrives
 */

const fs = require('fs');
const path = require('path');

const MARKER_FILE = '/tmp/developer-w10-ready.txt';
const MESSAGE_FILE = '/tmp/developer-w10-message.json';

function listener(event) {
  // Listen for agent completion or message events
  if (event.type === 'agent.message' && event.from === 'developer-w10') {
    console.log('[TEST-LEAD] Received message from developer-w10');
    console.log(JSON.stringify(event, null, 2));
    
    // Store the message
    if (event.summary) {
      fs.writeFileSync(MESSAGE_FILE, JSON.stringify(event.summary, null, 2));
      fs.writeFileSync(MARKER_FILE, Date.now().toString());
      console.log('[TEST-LEAD] ✓ Developer implementation summary received. Ready to write tests.');
    }
    
    return true;
  }
  
  if (event.type === 'agent.completed' && event.name === 'developer-w10') {
    console.log('[TEST-LEAD] Developer-w10 agent completed');
    if (!fs.existsSync(MARKER_FILE)) {
      fs.writeFileSync(MARKER_FILE, Date.now().toString());
    }
    return true;
  }
  
  return false;
}

module.exports = { listener, priority: 'high' };
