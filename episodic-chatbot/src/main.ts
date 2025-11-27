import './style.css';
import { memory } from './memory/episodicMemory';
import type { Episode } from './memory/episodicMemory';

// Chat responses based on memory recall
const responses = [
  "That's interesting! I'll remember that.",
  "Thanks for sharing. I've stored this in my memory.",
  "Got it! This is now part of my episodic memory.",
  "I understand. I've recorded this conversation.",
  "Noted! I can recall this later if needed.",
];

function getResponse(userMessage: string, memories: Episode[]): string {
  // If we have relevant memories, reference them
  if (memories.length > 0) {
    const memoryContext = memories
      .map(m => `"${m.content.slice(0, 50)}..."`)
      .join(', ');
    return `Based on what I remember (${memoryContext}), I can see this relates to our previous conversation. ${responses[Math.floor(Math.random() * responses.length)]}`;
  }

  // Check for memory-related questions
  if (userMessage.toLowerCase().includes('remember') || userMessage.toLowerCase().includes('recall')) {
    return "I'm searching my episodic memory for relevant information...";
  }

  if (userMessage.toLowerCase().includes('forget') || userMessage.toLowerCase().includes('clear')) {
    return "I can clear my memory if you'd like. Use the 'Clear Memory' button below.";
  }

  return responses[Math.floor(Math.random() * responses.length)];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessage(episode: Episode, memories?: Episode[]): string {
  const verifiedBadge = episode.signature
    ? `<span class="verified">&#10003; Signed</span>`
    : '';

  const memoryRecall = memories && memories.length > 0
    ? `<div class="memory-recall">
        <div class="memory-recall-header">&#128161; Recalled ${memories.length} related memories</div>
        ${memories.map(m => `
          <div class="memory-item">
            <div class="memory-item-role">${m.role}</div>
            <div>${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}</div>
          </div>
        `).join('')}
      </div>`
    : '';

  return `
    <div class="message ${episode.role}">
      ${episode.role === 'assistant' ? memoryRecall : ''}
      <div class="message-content">${episode.content}</div>
      <div class="message-meta">
        <span>${formatTime(episode.timestamp)}</span>
        ${verifiedBadge}
      </div>
    </div>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="empty-state">
      <h2>Episodic Memory Chatbot</h2>
      <p>A chatbot that remembers your conversations using local IndexedDB storage.</p>
      <ul class="feature-list">
        <li>&#128274; All data stored locally in your browser</li>
        <li>&#128269; Semantic memory recall using embeddings</li>
        <li>&#9989; Cryptographic signatures for message provenance</li>
        <li>&#128640; No server required - works offline</li>
      </ul>
    </div>
  `;
}

async function updateStats() {
  const count = await memory.getEpisodeCount();
  const statsEl = document.querySelector('.stats');
  if (statsEl) {
    statsEl.textContent = `${count} memories stored`;
  }
}

async function renderChat() {
  const chatContainer = document.querySelector('.chat-container');
  if (!chatContainer) return;

  const episodes = await memory.getRecentEpisodes(50);

  if (episodes.length === 0) {
    chatContainer.innerHTML = renderEmptyState();
    return;
  }

  chatContainer.innerHTML = episodes.reverse().map(ep => renderMessage(ep)).join('');
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleSend() {
  const input = document.querySelector<HTMLInputElement>('#message-input');
  const sendBtn = document.querySelector<HTMLButtonElement>('#send-btn');
  const chatContainer = document.querySelector('.chat-container');

  if (!input || !sendBtn || !chatContainer) return;

  const message = input.value.trim();
  if (!message) return;

  // Disable input while processing
  input.disabled = true;
  sendBtn.disabled = true;

  // Store user message
  const userEpisode = await memory.addEpisode('user', message);

  // Recall relevant memories
  const memories = await memory.recall(message, 3);
  const relevantMemories = memories.filter(m => m.id !== userEpisode.id);

  // Generate response
  const response = getResponse(message, relevantMemories);

  // Store assistant response
  const assistantEpisode = await memory.addEpisode('assistant', response);

  // Render messages
  chatContainer.innerHTML += renderMessage(userEpisode);
  chatContainer.innerHTML += renderMessage(assistantEpisode, relevantMemories);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Clear input and re-enable
  input.value = '';
  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();

  // Update stats
  await updateStats();
}

async function handleClearMemory() {
  if (confirm('Are you sure you want to clear all memories? This cannot be undone.')) {
    await memory.clearMemory();
    await renderChat();
    await updateStats();
  }
}

async function init() {
  // Set up the UI
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header>
      <h1><span>&#129504;</span> Episodic Memory Chat</h1>
      <div class="stats">Loading...</div>
    </header>

    <div class="chat-container"></div>

    <div class="input-container">
      <div class="input-wrapper">
        <input type="text" id="message-input" placeholder="Type a message..." autocomplete="off" />
        <button id="send-btn">Send</button>
      </div>
      <div class="controls">
        <button id="clear-btn">Clear Memory</button>
        <span id="memory-info"></span>
      </div>
    </div>
  `;

  // Initialize memory system
  await memory.init();

  // Set up event listeners
  const input = document.querySelector<HTMLInputElement>('#message-input');
  const sendBtn = document.querySelector<HTMLButtonElement>('#send-btn');
  const clearBtn = document.querySelector<HTMLButtonElement>('#clear-btn');

  sendBtn?.addEventListener('click', handleSend);
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
  clearBtn?.addEventListener('click', handleClearMemory);

  // Render initial state
  await renderChat();
  await updateStats();
}

init().catch(console.error);
