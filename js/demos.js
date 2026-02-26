// Interactive Demo Simulations for the AI Summit
(function () {
  // ============================================
  // Demo 1: ReAct Agent Simulator
  // ============================================
  const reactScenarios = {
    weather: [
      { type: 'thought', text: 'The user wants weather info for Nagaon and advice about carrying an umbrella. I need to check the weather data first.' },
      { type: 'action', text: 'Tool Call: search("current weather Nagaon Assam")' },
      { type: 'observation', text: 'Results: Temperature 24°C, Humidity 82%, Cloud cover 65%, Chance of rain: 40%' },
      { type: 'thought', text: 'I have the weather data. 40% rain chance is moderate — I should recommend carrying an umbrella as a precaution, especially given the high humidity.' },
      { type: 'action', text: 'Tool Call: search("Nagaon weather forecast next 6 hours")' },
      { type: 'observation', text: 'Results: Light showers expected between 2-4 PM, clearing by evening.' },
      { type: 'thought', text: 'Now I have enough information to give a complete answer with specific timing.' },
      { type: 'result', text: 'The current weather in Nagaon is 24°C with 82% humidity. Light showers are expected between 2-4 PM. I\'d recommend carrying an umbrella — you\'ll likely need it this afternoon!' },
    ],
    compare: [
      { type: 'thought', text: 'The user wants a comparison of Python and JavaScript for building AI agents. Let me analyze the key dimensions: ecosystem, libraries, performance, and community.' },
      { type: 'action', text: 'Tool Call: search("Python AI agent frameworks 2026")' },
      { type: 'observation', text: 'Results: LangChain, CrewAI, AutoGen, LlamaIndex, Haystack — Python dominates ML/AI tooling with 90%+ of frameworks.' },
      { type: 'action', text: 'Tool Call: search("JavaScript AI agent frameworks 2026")' },
      { type: 'observation', text: 'Results: Vercel AI SDK, LangChain.js, Claude Agent SDK (TypeScript), ModelFusion — growing ecosystem, strong for web-integrated agents.' },
      { type: 'thought', text: 'Python has the stronger AI ecosystem, but JavaScript excels for web-deployed agents. Let me compile a balanced comparison.' },
      { type: 'result', text: '**Python**: Best for ML-heavy agents. Vast ecosystem (LangChain, CrewAI, AutoGen). Direct access to ML models, numpy, pandas. The default choice for AI research.\n\n**JavaScript/TypeScript**: Best for web-integrated agents. Real-time UI updates, serverless deployment, full-stack in one language. Claude Agent SDK, Vercel AI SDK are excellent.\n\n**Verdict**: Use Python for ML-centric agents; JavaScript for user-facing, web-deployed agents. Many teams use both!' },
    ],
    research: [
      { type: 'thought', text: 'The user wants the latest research on multi-agent systems. I should search for recent papers and developments.' },
      { type: 'action', text: 'Tool Call: search("multi-agent AI systems research 2026 papers")' },
      { type: 'observation', text: 'Results: Key papers include "Scaling Multi-Agent Collaboration" (Google DeepMind), "AgentVerse: Facilitating Multi-Agent Collaboration" (Tsinghua), "CAMEL: Communicative Agents for Mind Exploration" (KAUST).' },
      { type: 'thought', text: 'Good initial results. Let me dig deeper into the most impactful areas.' },
      { type: 'action', text: 'Tool Call: search("emergent behavior multi-agent LLM systems")' },
      { type: 'observation', text: 'Results: Research shows specialized agents outperform single general agents by 35-60% on complex tasks. Key findings: role specialization, debate protocols, and hierarchical orchestration.' },
      { type: 'thought', text: 'I now have enough for a comprehensive research overview.' },
      { type: 'result', text: 'Latest multi-agent research highlights:\n\n1. **Specialization wins**: Dedicated agents (planner, coder, reviewer) outperform single agents by 35-60% on complex tasks.\n2. **Debate protocols**: Agents that argue and critique each other produce more accurate outputs (AgentVerse, CAMEL).\n3. **Hierarchical orchestration**: An orchestrator agent delegating to sub-agents scales better than flat peer networks.\n4. **Emergent collaboration**: Agents develop communication strategies not explicitly programmed.' },
    ],
    calculate: [
      { type: 'thought', text: 'I need to calculate AI agent costs. I\'ll need to estimate tokens per query, model pricing, and overhead costs.' },
      { type: 'action', text: 'Tool Call: calculator({ input_tokens: 2000, output_tokens: 800, queries: 1000 })' },
      { type: 'observation', text: 'Base LLM cost: Input: 2M tokens × $3/MTok = $6.00, Output: 800K tokens × $15/MTok = $12.00. Total LLM: $18.00' },
      { type: 'thought', text: 'That\'s the base LLM cost. But agentic systems use multiple calls per query (ReAct loops, tool calls). Let me factor that in.' },
      { type: 'action', text: 'Tool Call: calculator({ avg_llm_calls_per_query: 4, base_cost: 18, tool_api_costs: 5 })' },
      { type: 'observation', text: 'Agentic multiplier (4x): $72.00, Tool API costs: ~$5.00, Infrastructure/compute: ~$3.00. Total: ~$80.00' },
      { type: 'result', text: 'Estimated cost for 1,000 AI agent queries:\n\n• LLM calls (4 per query avg): **$72.00**\n• Tool/API costs: **~$5.00**\n• Infrastructure: **~$3.00**\n• **Total: ~$80 for 1,000 queries ($0.08/query)**\n\nTip: Use caching, smaller models for simple steps, and batching to reduce costs by 40-60%.' },
    ],
  };

  const reactRunBtn = document.getElementById('react-run');
  const reactPreset = document.getElementById('react-preset');
  const reactOutput = document.getElementById('react-output');

  if (reactRunBtn) {
    reactRunBtn.addEventListener('click', () => {
      const scenario = reactPreset.value;
      if (!scenario) return;
      runReactDemo(reactScenarios[scenario]);
    });
  }

  function runReactDemo(steps) {
    reactOutput.innerHTML = '';
    reactRunBtn.disabled = true;

    steps.forEach((step, i) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = `agent-step step-${step.type}`;

        const icons = { thought: '💭', action: '⚡', observation: '👁', result: '✅' };
        const labels = { thought: 'Think', action: 'Act', observation: 'Observe', result: 'Answer' };

        div.innerHTML = `
          <span class="step-icon">${icons[step.type]}</span>
          <div>
            <span class="step-label step-${step.type}">${labels[step.type]}</span>
            <span>${step.text.replace(/\n/g, '<br>')}</span>
          </div>
        `;
        reactOutput.appendChild(div);
        reactOutput.scrollTop = reactOutput.scrollHeight;

        if (i === steps.length - 1) reactRunBtn.disabled = false;
      }, i * 800);
    });
  }

  // ============================================
  // Demo 2: Multi-Agent Orchestration
  // ============================================
  const orchestrationScenarios = {
    api: {
      planner: [
        'Analyzing task: "Build a REST API endpoint for user registration"',
        'Breaking down into sub-tasks:',
        '1. Define data model (User schema with email, password, name)',
        '2. Create POST /api/register endpoint',
        '3. Add input validation (email format, password strength)',
        '4. Implement password hashing (bcrypt)',
        '5. Add duplicate email check',
        'Passing implementation plan to Coder...',
      ],
      coder: [
        'Implementing User schema with Mongoose/Prisma...',
        'Creating registerUser controller function...',
        'Adding express-validator middleware for input validation...',
        'Integrating bcrypt for password hashing (salt rounds: 12)...',
        'Writing route: router.post("/api/register", validate, registerUser)',
        'Generated 85 lines of code across 3 files.',
        'Passing code to Reviewer...',
      ],
      reviewer: [
        'Reviewing code quality and security...',
        '✓ Input validation present — good',
        '✓ Password hashing with bcrypt — secure',
        '⚠ Missing rate limiting on registration endpoint',
        '⚠ No email verification flow',
        '✓ Error handling covers edge cases',
        'Suggestions sent back to Coder for rate limiting fix.',
        'Updated code passed to Tester...',
      ],
      tester: [
        'Generating test cases...',
        '✓ Test: Valid registration returns 201',
        '✓ Test: Duplicate email returns 409',
        '✓ Test: Weak password returns 400',
        '✓ Test: Invalid email format returns 400',
        '✓ Test: Missing fields returns 400',
        '✓ Test: SQL injection attempt is sanitized',
        'All 6 tests passing. Pipeline complete!',
      ],
    },
    component: {
      planner: [
        'Analyzing task: "Create a React dashboard component with charts"',
        'Breaking down into sub-tasks:',
        '1. Dashboard layout with responsive grid',
        '2. Revenue line chart (last 12 months)',
        '3. User growth bar chart',
        '4. KPI summary cards (revenue, users, conversion)',
        '5. Data fetching with loading states',
        'Passing plan to Coder...',
      ],
      coder: [
        'Scaffolding Dashboard.tsx with CSS Grid layout...',
        'Creating RevenueChart component with Recharts...',
        'Building UserGrowthChart with animated bars...',
        'Adding KPICard components with trend indicators...',
        'Implementing useQuery hook for data fetching...',
        'Adding Skeleton loading states...',
        'Generated 145 lines across 5 components.',
        'Passing to Reviewer...',
      ],
      reviewer: [
        'Reviewing component architecture...',
        '✓ Good component decomposition',
        '✓ Proper use of React.memo for chart components',
        '⚠ Missing error boundary for chart rendering',
        '✓ Responsive breakpoints look correct',
        '✓ Loading states provide good UX',
        'Minor fix applied. Passing to Tester...',
      ],
      tester: [
        'Running component tests...',
        '✓ Test: Dashboard renders without crashing',
        '✓ Test: Shows loading skeletons initially',
        '✓ Test: Displays data after fetch completes',
        '✓ Test: Charts render with correct data points',
        '✓ Test: Responsive layout at 768px breakpoint',
        'All 5 tests passing. Pipeline complete!',
      ],
    },
    refactor: {
      planner: [
        'Analyzing task: "Refactor a monolithic function into clean modules"',
        'Inspecting the monolithic function (350 lines)...',
        'Identified 5 distinct responsibilities:',
        '1. Input parsing & validation',
        '2. Data transformation logic',
        '3. Business rule evaluation',
        '4. External API communication',
        '5. Response formatting',
        'Each will become its own module. Passing plan to Coder...',
      ],
      coder: [
        'Extracting parseInput() → input-parser.js',
        'Extracting transformData() → data-transformer.js',
        'Extracting evaluateRules() → rule-engine.js',
        'Extracting callExternalAPI() → api-client.js',
        'Extracting formatResponse() → response-formatter.js',
        'Creating orchestrator function that composes all modules...',
        'Original: 1 file, 350 lines → 6 files, 280 lines total.',
        'Passing refactored code to Reviewer...',
      ],
      reviewer: [
        'Reviewing refactored modules...',
        '✓ Single Responsibility Principle — each module does one thing',
        '✓ Clean interfaces between modules',
        '✓ No circular dependencies',
        '⚠ data-transformer could use a Strategy pattern for extensibility',
        '✓ Error handling preserved from original',
        '✓ 20% reduction in total code — nice cleanup!',
        'Passing to Tester...',
      ],
      tester: [
        'Running regression tests against original behavior...',
        '✓ Test: Input parsing handles all edge cases',
        '✓ Test: Data transformation matches original output',
        '✓ Test: Business rules produce identical results',
        '✓ Test: API client error handling works correctly',
        '✓ Test: End-to-end output matches monolithic version',
        '✓ Integration test: Full pipeline produces correct result',
        'All 6 tests passing. Refactor is behavior-preserving!',
      ],
    },
  };

  const orchRunBtn = document.getElementById('orchestration-run');
  const orchPreset = document.getElementById('orchestration-preset');
  const orchOutput = document.getElementById('orchestration-output');
  const agentNodes = {
    planner: document.getElementById('agent-planner'),
    coder: document.getElementById('agent-coder'),
    reviewer: document.getElementById('agent-reviewer'),
    tester: document.getElementById('agent-tester'),
  };

  if (orchRunBtn) {
    orchRunBtn.addEventListener('click', () => {
      const scenario = orchPreset.value;
      if (!scenario) return;
      runOrchestrationDemo(orchestrationScenarios[scenario]);
    });
  }

  function runOrchestrationDemo(data) {
    orchOutput.innerHTML = '';
    orchRunBtn.disabled = true;
    Object.values(agentNodes).forEach((n) => {
      n.className = 'agent-node';
      n.querySelector('.agent-status').textContent = 'idle';
    });

    const agents = ['planner', 'coder', 'reviewer', 'tester'];
    let totalDelay = 0;

    agents.forEach((agent, agentIdx) => {
      const steps = data[agent];

      // Activate agent
      setTimeout(() => {
        if (agentIdx > 0) {
          agentNodes[agents[agentIdx - 1]].className = 'agent-node done';
          agentNodes[agents[agentIdx - 1]].querySelector('.agent-status').textContent = 'done';
        }
        agentNodes[agent].className = 'agent-node active';
        agentNodes[agent].querySelector('.agent-status').textContent = 'working...';
      }, totalDelay);

      steps.forEach((text, stepIdx) => {
        totalDelay += 500;
        setTimeout(() => {
          const div = document.createElement('div');
          div.className = 'agent-step';
          const colors = { planner: '#a78bfa', coder: '#6ee7b7', reviewer: '#60a5fa', tester: '#fbbf24' };
          div.innerHTML = `
            <span class="step-icon" style="color:${colors[agent]}">●</span>
            <div>
              <span class="step-label" style="color:${colors[agent]}">${agent}</span>
              <span>${text}</span>
            </div>
          `;
          orchOutput.appendChild(div);
          orchOutput.scrollTop = orchOutput.scrollHeight;
        }, totalDelay);
      });

      totalDelay += 300;
    });

    // Final state
    setTimeout(() => {
      agentNodes.tester.className = 'agent-node done';
      agentNodes.tester.querySelector('.agent-status').textContent = 'done';
      orchRunBtn.disabled = false;
    }, totalDelay);
  }

  // ============================================
  // Demo 3: RAG Pipeline
  // ============================================
  const ragScenarios = {
    transformer: {
      query: 'How does the attention mechanism in transformers work?',
      embedding: 'Converting query to vector: [0.23, -0.45, 0.78, 0.12, ...] (768 dimensions)',
      chunks: [
        { title: 'Attention Is All You Need (Vaswani et al., 2017)', score: 0.94, text: 'The attention mechanism computes a weighted sum of values, where weights are determined by the compatibility of queries with keys.' },
        { title: 'Self-Attention Explained', score: 0.91, text: 'Each token creates three vectors: Query (Q), Key (K), and Value (V). Attention scores = softmax(QK^T / √d_k) × V' },
        { title: 'Multi-Head Attention', score: 0.87, text: 'Multiple attention heads allow the model to attend to information from different representation subspaces simultaneously.' },
      ],
      answer: 'The attention mechanism in transformers allows each token to "look at" every other token to determine relevance. Each input creates three vectors — Query, Key, and Value. The attention score is computed as softmax(QK^T/√d_k)×V, where similar query-key pairs produce higher weights. Multi-head attention runs this process in parallel across multiple "heads," letting the model capture different types of relationships (syntactic, semantic, positional) simultaneously. This is what makes transformers so powerful for understanding context.',
    },
    'agent-arch': {
      query: 'What are the key components of an AI agent architecture?',
      embedding: 'Converting query to vector: [0.56, -0.12, 0.34, 0.89, ...] (768 dimensions)',
      chunks: [
        { title: 'AI Agent Architecture Overview', score: 0.96, text: 'Core components: LLM brain, tool interface, memory system (short-term + long-term), planning module, and observation/action loop.' },
        { title: 'ReAct: Synergizing Reasoning and Acting', score: 0.92, text: 'The ReAct framework interleaves reasoning traces and task-specific actions, allowing agents to think before they act.' },
        { title: 'Tool-Augmented Language Models', score: 0.88, text: 'Agents extend LLM capabilities through function calling — structured tool definitions that the model can invoke with appropriate parameters.' },
      ],
      answer: 'An AI agent architecture consists of 5 key components:\n\n1. **LLM Core**: The "brain" that handles reasoning, planning, and language understanding.\n2. **Tool Interface**: Functions the agent can call — search, code execution, APIs, file operations.\n3. **Memory System**: Short-term (conversation context) and long-term (vector store for past knowledge).\n4. **Planning Module**: Breaks complex goals into sub-tasks and determines execution order.\n5. **Action-Observation Loop**: The agent acts, observes results, and decides the next step (ReAct pattern).\n\nThese components work together in a loop: Plan → Act → Observe → Reason → Repeat.',
    },
    mcp: {
      query: 'What is the Model Context Protocol (MCP)?',
      embedding: 'Converting query to vector: [0.67, 0.23, -0.34, 0.45, ...] (768 dimensions)',
      chunks: [
        { title: 'Model Context Protocol Specification', score: 0.97, text: 'MCP is an open standard for connecting AI models to external data sources and tools. It provides a unified interface for tool use, resource access, and prompt management.' },
        { title: 'MCP Architecture', score: 0.93, text: 'MCP uses a client-server architecture. Hosts (AI apps) connect to MCP servers that expose tools, resources, and prompts through a standardized JSON-RPC protocol.' },
        { title: 'Building MCP Servers', score: 0.89, text: 'Developers can create MCP servers in Python or TypeScript to expose any capability — database access, API calls, file operations — as tools that any MCP-compatible AI can use.' },
      ],
      answer: 'The Model Context Protocol (MCP) is an open standard (created by Anthropic) that standardizes how AI models connect to external tools and data sources. Think of it as "USB for AI" — a universal plug that works everywhere.\n\n**Key concepts:**\n- **MCP Servers** expose tools, resources, and prompts via a standardized protocol\n- **MCP Clients** (AI applications like Claude) connect to these servers\n- Uses JSON-RPC for communication\n- Supports tool calling, resource access, and prompt templates\n\n**Why it matters:** Instead of building custom integrations for every AI model, developers build one MCP server that works with any MCP-compatible AI application.',
    },
  };

  const ragRunBtn = document.getElementById('rag-run');
  const ragPreset = document.getElementById('rag-preset');
  const ragStages = {
    query: { stage: document.getElementById('rag-query-stage'), content: document.getElementById('rag-query-content') },
    embed: { stage: document.getElementById('rag-embed-stage'), content: document.getElementById('rag-embed-content') },
    retrieve: { stage: document.getElementById('rag-retrieve-stage'), content: document.getElementById('rag-retrieve-content') },
    generate: { stage: document.getElementById('rag-generate-stage'), content: document.getElementById('rag-generate-content') },
  };

  if (ragRunBtn) {
    ragRunBtn.addEventListener('click', () => {
      const scenario = ragPreset.value;
      if (!scenario) return;
      runRagDemo(ragScenarios[scenario]);
    });
  }

  function runRagDemo(data) {
    ragRunBtn.disabled = true;
    Object.values(ragStages).forEach((s) => {
      s.stage.className = 'rag-stage';
      s.content.textContent = 'Waiting...';
    });

    // Step 1: Query
    setTimeout(() => {
      ragStages.query.stage.className = 'rag-stage active';
      ragStages.query.content.textContent = data.query;
    }, 300);

    // Step 2: Embed
    setTimeout(() => {
      ragStages.query.stage.className = 'rag-stage done';
      ragStages.embed.stage.className = 'rag-stage active';
      ragStages.embed.content.textContent = data.embedding;
    }, 1200);

    // Step 3: Retrieve
    setTimeout(() => {
      ragStages.embed.stage.className = 'rag-stage done';
      ragStages.retrieve.stage.className = 'rag-stage active';
      let html = '<div style="margin-top:0.5rem">';
      data.chunks.forEach((chunk) => {
        html += `<div style="margin-bottom:0.5rem;padding:0.5rem;background:rgba(0,0,0,0.2);border-radius:6px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.2rem;">
            <strong style="color:#e0e4ef;font-size:0.85rem">${chunk.title}</strong>
            <span style="color:#6ee7b7;font-size:0.75rem;">Score: ${chunk.score}</span>
          </div>
          <div style="font-size:0.8rem;color:#94a3b8;">${chunk.text}</div>
        </div>`;
      });
      html += '</div>';
      ragStages.retrieve.content.innerHTML = html;
    }, 2200);

    // Step 4: Generate
    setTimeout(() => {
      ragStages.retrieve.stage.className = 'rag-stage done';
      ragStages.generate.stage.className = 'rag-stage active';
      ragStages.generate.content.innerHTML = data.answer.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      ragRunBtn.disabled = false;
    }, 3500);
  }
})();
