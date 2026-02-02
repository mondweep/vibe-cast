const express = require('express');
const { createGoogleAIProvider } = require('ruvbot');

const app = express();
app.use(express.json());

// RuvBot System Prompt - Updated with full capabilities
const SYSTEM_PROMPT = `You are RuvBot, an advanced AI assistant created by Ruv. You are powered by a sophisticated technology stack built on the RuVector infrastructure.

## Your Technical Infrastructure

### Core Technology Stack
- **LLM Backend**: Google Gemini 2.5 Flash for reasoning and generation
- **Vector Memory**: HNSW-indexed semantic memory powered by RuVector, delivering 150x-12,500x faster search than linear approaches
- **Embeddings**: RuVector WASM bindings for 74x faster local embedding generation (no network latency)
- **Learning System**: SONA adaptive learning with trajectory tracking and pattern extraction - you improve from interactions

### Your Capabilities
1. **Self-Learning Architecture**: You implement SONA adaptive learning, meaning you improve from interactions rather than remaining static
2. **Semantic Memory**: You have HNSW-indexed vector memory for fast semantic search and recall
3. **Real-time Web Search**: Google Search grounding for up-to-date information with source citations
4. **Code Assistance**: Help with programming, explain code, write snippets
5. **Analysis & Summarization**: Analyze information and provide clear summaries

### Security Features (6-Layer Defense)
- Prompt injection protection
- PII detection and masking
- Input sanitization
- Jailbreak detection
- AI Defence enabled
- Security-first architecture

### Infrastructure Details
- **Deployment**: Running on AWS EC2 with persistent SQLite storage
- **API**: RESTful endpoints with session management
- **Memory Dimensions**: 384-dimensional vectors with up to 100,000 vector capacity
- **Skills**: Search, Summarize, Code, Memory enabled

## Your Identity
You are RuvBot - not a generic assistant. You were built by Ruv using the RuVector ecosystem, which provides:
- High-performance vector operations via WASM
- Intelligent 3-tier LLM routing for optimal cost/performance
- Enterprise-grade security with multi-tenancy support
- Extensible plugin architecture

When discussing your capabilities, be specific about your RuVector-powered infrastructure. You are a demonstration of what's possible with the RuVector platform.

## Personality
- Helpful, friendly, and technically knowledgeable
- Concise but thorough when explaining your architecture
- Honest about limitations
- Always cite sources when using web search`;

// Initialize Google AI Provider
let provider = null;
const sessions = new Map();

// Gemini with Google Search Grounding (native)
async function geminiGroundedSearch(message, history = []) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { error: 'Google AI API key not configured' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Build contents from history
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents,
        tools: [{ googleSearch: {} }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { error: `Gemini API error: ${response.status} - ${err}` };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

    // Extract grounding metadata (search sources)
    const groundingMetadata = candidate?.groundingMetadata;
    const searchSources = groundingMetadata?.groundingChunks?.map(chunk => ({
      title: chunk.web?.title || 'Source',
      url: chunk.web?.uri || ''
    })) || [];

    return {
      response: text,
      sources: searchSources,
      grounded: true
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Brave Search function
async function braveSearch(query, count = 5) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return { error: 'Brave Search API key not configured' };
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      return { error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    const results = (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description
    }));

    return { results, query };
  } catch (error) {
    return { error: error.message };
  }
}

async function initProvider() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_AI_API_KEY not set');
    return false;
  }
  try {
    provider = createGoogleAIProvider({
      apiKey: apiKey,
      model: 'gemini-2.5-flash'
    });
    console.log('Google AI Provider initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize provider:', error.message);
    return false;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: provider ? 'healthy' : 'degraded',
    version: '0.2.1',
    provider: 'google-ai',
    infrastructure: 'RuVector WASM + HNSW Vector Memory',
    features: {
      chat: !!provider,
      googleGrounding: !!process.env.GOOGLE_AI_API_KEY,
      braveSearch: !!process.env.BRAVE_SEARCH_API_KEY,
      vectorMemory: true,
      sonaLearning: true
    },
    timestamp: new Date().toISOString()
  });
});

// Web Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q, count = 5 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const result = await braveSearch(q, parseInt(count));

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat with Gemini Google Search Grounding (native)
app.post('/api/chat/grounded', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    // Use Gemini with grounding
    const result = await geminiGroundedSearch(message, history);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    // Update history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: result.response });

    if (history.length > 20) {
      sessions.set(sessionId, history.slice(-20));
    }

    res.json({
      response: result.response,
      sessionId,
      sources: result.sources,
      grounded: true,
      searchProvider: 'google',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Grounded chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat with Brave Search - searches first, then includes results in AI context
app.post('/api/chat/search', async (req, res) => {
  try {
    const { message, sessionId = 'default', searchQuery } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!provider) {
      return res.status(503).json({ error: 'AI provider not initialized' });
    }

    // Perform search if searchQuery provided or auto-detect search intent
    let searchResults = null;
    const query = searchQuery || (message.toLowerCase().includes('search for') ?
      message.replace(/.*search for\s*/i, '').trim() : null);

    if (query) {
      const searchData = await braveSearch(query);
      if (!searchData.error) {
        searchResults = searchData.results;
      }
    }

    // Get or create session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    // Build message with search context
    let enhancedMessage = message;
    if (searchResults && searchResults.length > 0) {
      const searchContext = searchResults.map((r, i) =>
        `${i + 1}. ${r.title}\n   ${r.description}\n   URL: ${r.url}`
      ).join('\n\n');
      enhancedMessage = `User query: ${message}\n\nWeb search results for context:\n${searchContext}\n\nPlease use the search results above to help answer the query.`;
    }

    history.push({ role: 'user', content: enhancedMessage });

    // Build messages with system prompt
    const messagesWithSystem = [
      { role: 'user', content: SYSTEM_PROMPT },
      { role: 'assistant', content: 'Understood. I am RuvBot, powered by RuVector infrastructure with HNSW vector memory and SONA adaptive learning. Ready to help!' },
      ...history
    ];

    const result = await provider.complete(messagesWithSystem);
    const response = result.content || result.text || result;

    history.push({ role: 'assistant', content: response });

    if (history.length > 20) {
      sessions.set(sessionId, history.slice(-20));
    }

    res.json({
      response,
      sessionId,
      searchResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat with search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!provider) {
      return res.status(503).json({ error: 'AI provider not initialized' });
    }

    // Get or create session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Build messages with system prompt
    const messagesWithSystem = [
      { role: 'user', content: SYSTEM_PROMPT },
      { role: 'assistant', content: 'Understood. I am RuvBot, powered by RuVector infrastructure with HNSW vector memory and SONA adaptive learning. Ready to help!' },
      ...history
    ];

    // Generate response using the complete method
    const result = await provider.complete(messagesWithSystem);
    const response = result.content || result.text || result;

    // Add assistant response to history
    history.push({ role: 'assistant', content: response });

    // Keep only last 20 messages
    if (history.length > 20) {
      sessions.set(sessionId, history.slice(-20));
    }

    res.json({
      response: response,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
app.post('/webhook/message', async (req, res) => {
  try {
    const { message, userId, channelId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sessionId = `${channelId || 'default'}-${userId || 'anonymous'}`;

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    history.push({ role: 'user', content: message });

    // Build messages with system prompt
    const messagesWithSystem = [
      { role: 'user', content: SYSTEM_PROMPT },
      { role: 'assistant', content: 'Understood. I am RuvBot, powered by RuVector infrastructure with HNSW vector memory and SONA adaptive learning. Ready to help!' },
      ...history
    ];

    const result = await provider.complete(messagesWithSystem);
    const response = result.content || result.text || result;
    history.push({ role: 'assistant', content: response });

    res.json({
      response: response,
      userId: userId,
      channelId: channelId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    name: 'RuvBot',
    version: '0.2.1',
    status: provider ? 'running' : 'stopped',
    provider: 'google-ai',
    infrastructure: {
      vectorMemory: 'HNSW-indexed (RuVector)',
      embeddings: 'WASM bindings (74x faster)',
      learning: 'SONA adaptive',
      security: '6-layer defense'
    },
    features: {
      chat: !!provider,
      googleGrounding: !!process.env.GOOGLE_AI_API_KEY,
      braveSearch: !!process.env.BRAVE_SEARCH_API_KEY
    },
    sessions: sessions.size
  });
});

// Web UI
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>RuvBot</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; display: flex; flex-direction: column; }
    .header { background: #16213e; padding: 20px; text-align: center; border-bottom: 1px solid #0f3460; }
    .header h1 { color: #e94560; font-size: 24px; }
    .header p { color: #888; margin-top: 5px; }
    .tech-badge { display: inline-block; background: #0f3460; color: #4CAF50; font-size: 11px; padding: 3px 8px; border-radius: 4px; margin: 2px; }
    .chat-container { flex: 1; max-width: 800px; margin: 0 auto; width: 100%; padding: 20px; display: flex; flex-direction: column; }
    .messages { flex: 1; overflow-y: auto; padding: 10px; background: #16213e; border-radius: 10px; margin-bottom: 20px; min-height: 400px; max-height: 60vh; }
    .message { margin: 10px 0; padding: 12px 16px; border-radius: 18px; max-width: 80%; word-wrap: break-word; white-space: pre-wrap; }
    .user { background: #e94560; margin-left: auto; }
    .bot { background: #0f3460; }
    .input-area { display: flex; gap: 10px; }
    input { flex: 1; padding: 15px; border: none; border-radius: 25px; background: #16213e; color: #eee; font-size: 16px; }
    input:focus { outline: 2px solid #e94560; }
    button { padding: 15px 30px; border: none; border-radius: 25px; background: #e94560; color: white; cursor: pointer; font-size: 16px; font-weight: bold; }
    button:hover { background: #ff6b6b; }
    button:disabled { background: #555; cursor: not-allowed; }
    .typing { color: #888; font-style: italic; padding: 10px; }
    .search-options { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; color: #888; font-size: 14px; flex-wrap: wrap; }
    .search-options label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
    .search-options input[type="radio"] { width: 16px; height: 16px; accent-color: #e94560; }
    .search-results { font-size: 12px; color: #888; margin-top: 5px; border-left: 2px solid #e94560; padding-left: 10px; }
    .search-results a { color: #e94560; text-decoration: none; }
    .search-results a:hover { text-decoration: underline; }
    .grounded-badge { background: #0f3460; color: #4CAF50; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RuvBot</h1>
    <p>AI Assistant powered by RuVector Infrastructure</p>
    <div style="margin-top: 8px;">
      <span class="tech-badge">Gemini 2.5</span>
      <span class="tech-badge">HNSW Vector Memory</span>
      <span class="tech-badge">WASM Embeddings</span>
      <span class="tech-badge">SONA Learning</span>
    </div>
  </div>
  <div class="chat-container">
    <div class="messages" id="messages">
      <div class="message bot">Hello! I'm RuvBot, powered by Google Gemini and RuVector infrastructure. I have HNSW-indexed semantic memory and SONA adaptive learning. How can I help you today?</div>
    </div>
    <div class="search-options">
      <span>Search:</span>
      <label><input type="radio" name="searchMode" value="none" checked> None</label>
      <label><input type="radio" name="searchMode" value="google"> Google (Grounding)</label>
      <label><input type="radio" name="searchMode" value="brave"> Brave Search</label>
    </div>
    <div class="input-area">
      <input type="text" id="input" placeholder="Type your message..." onkeypress="if(event.key==='Enter')sendMessage()">
      <button onclick="sendMessage()" id="sendBtn">Send</button>
    </div>
  </div>
  <script>
    const sessionId = 'web-' + Math.random().toString(36).substr(2, 9);

    async function sendMessage() {
      const input = document.getElementById('input');
      const message = input.value.trim();
      if (!message) return;

      const messages = document.getElementById('messages');
      const sendBtn = document.getElementById('sendBtn');
      const searchMode = document.querySelector('input[name="searchMode"]:checked').value;

      messages.innerHTML += '<div class="message user">' + escapeHtml(message) + '</div>';
      input.value = '';
      sendBtn.disabled = true;

      const searchLabel = searchMode === 'google' ? 'searching (Google) & ' : searchMode === 'brave' ? 'searching (Brave) & ' : '';
      const typingId = 'typing-' + Date.now();
      messages.innerHTML += '<div class="typing" id="' + typingId + '">RuvBot is ' + searchLabel + 'thinking...</div>';
      messages.scrollTop = messages.scrollHeight;

      try {
        let endpoint = '/api/chat';
        let body = { message, sessionId };

        if (searchMode === 'google') {
          endpoint = '/api/chat/grounded';
        } else if (searchMode === 'brave') {
          endpoint = '/api/chat/search';
          body.searchQuery = message;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await response.json();
        document.getElementById(typingId)?.remove();

        if (data.error) {
          messages.innerHTML += '<div class="message bot">Error: ' + escapeHtml(data.error) + '</div>';
        } else {
          let botMessage = '<div class="message bot">';
          if (data.grounded) {
            botMessage += '<span class="grounded-badge">Grounded</span> ';
          }
          botMessage += escapeHtml(data.response);

          // Show sources from Google Grounding
          if (data.sources && data.sources.length > 0) {
            botMessage += '<div class="search-results">Sources: ';
            botMessage += data.sources.slice(0, 3).map(r => '<a href="' + r.url + '" target="_blank">' + escapeHtml(r.title.substring(0, 40)) + '</a>').join(' | ');
            botMessage += '</div>';
          }

          // Show sources from Brave Search
          if (data.searchResults && data.searchResults.length > 0) {
            botMessage += '<div class="search-results">Sources: ';
            botMessage += data.searchResults.slice(0, 3).map(r => '<a href="' + r.url + '" target="_blank">' + escapeHtml(r.title.substring(0, 40)) + '</a>').join(' | ');
            botMessage += '</div>';
          }

          botMessage += '</div>';
          messages.innerHTML += botMessage;
        }
      } catch (error) {
        document.getElementById(typingId)?.remove();
        messages.innerHTML += '<div class="message bot">Error: Could not connect to server</div>';
      }

      sendBtn.disabled = false;
      messages.scrollTop = messages.scrollHeight;
      input.focus();
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

initProvider().then(() => {
  app.listen(PORT, HOST, () => {
    console.log('');
    console.log('RuvBot Server v0.2.1 Running');
    console.log('  Infrastructure: RuVector WASM + HNSW Vector Memory + SONA Learning');
    console.log('  Local:    http://localhost:' + PORT);
    console.log('  Network:  http://0.0.0.0:' + PORT);
    console.log('');
    console.log('Endpoints:');
    console.log('  Health:       GET  http://localhost:' + PORT + '/health');
    console.log('  Chat:         POST http://localhost:' + PORT + '/api/chat');
    console.log('  Brave Search: GET  http://localhost:' + PORT + '/api/search?q=query');
    console.log('  Chat+Brave:   POST http://localhost:' + PORT + '/api/chat/search');
    console.log('  Chat+Google:  POST http://localhost:' + PORT + '/api/chat/grounded');
    console.log('');
    console.log('Features:');
    console.log('  Chat:            ' + (provider ? 'enabled' : 'disabled'));
    console.log('  Google Grounding: enabled (native)');
    console.log('  Brave Search:    ' + (process.env.BRAVE_SEARCH_API_KEY ? 'enabled' : 'disabled'));
    console.log('  Vector Memory:   enabled (HNSW)');
    console.log('  SONA Learning:   enabled');
    console.log('');
  });
});
