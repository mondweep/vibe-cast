# Inference Services and Agents in Microsoft Agent Framework

## Overview

The Microsoft Agent Framework provides a powerful abstraction layer for building AI agents based on **inference services**. Understanding the relationship between inference services and agents is fundamental to effectively using the framework.

## What Are Inference Services?

**Inference services** are cloud-based APIs that provide language model capabilities. They handle the actual computation and response generation using large language models (LLMs).

### Core Abstraction: IChatClient

The framework uses a standardized interface called **`Microsoft.Extensions.AI.IChatClient`** to communicate with any inference service. This abstraction layer means:

- **Service agnostic**: Any service that implements `IChatClient` can be used to build agents
- **Consistent interface**: The same agent code works with different backends (OpenAI, Azure OpenAI, Anthropic, etc.)
- **Flexible switching**: Change backends without rewriting agent logic

## Agent Architecture: The Agentic Loop

All agents in the Microsoft Agent Framework follow a **structured runtime execution model** that orchestrates the interaction between user input, the inference service, and tool execution:

```
┌─────────────────────────────────────────────────────────────┐
│                        User Message                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Initialize with Prompt Instructions             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
        ╔═══════════════════════════════════════════════╗
        ║     Agentic Loop (iterative until complete)   ║
        ╠═══════════════════════════════════════════════╣
        │                                               │
        │  1. Send Request + Prompt + Context           │
        │     to Inference Service                      │
        │                                               │
        │  2. Inference Service processes &             │
        │     decides next action (response or          │
        │     tool call)                                │
        │                                               │
        │  3. Decision point:                           │
        │     ├─ If [Tool/MCP Call Required]            │
        │     │  - Execute Tool/MCP Function            │
        │     │  - Return Result                        │
        │     │  - Loop continues with results          │
        │     │                                          │
        │     └─ If [Task Complete]                     │
        │        - Return Final Response                │
        │        - Exit loop                            │
        │                                               │
        ╚═══════════════════════════════════════════════╝
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Return Final Response                      │
└─────────────────────────────────────────────────────────────┘
```

## How Agents Are Based on Inference Services

### 1. **ChatClientAgent: The Foundation**

The primary agent type for inference services is `ChatClientAgent`, which wraps any `IChatClient` implementation:

```csharp
using Microsoft.Agents.AI;

// Create agent with any IChatClient
var agent = new ChatClientAgent(
    chatClient, 
    instructions: "You are a helpful assistant"
);
```

The `ChatClientAgent` handles:
- **Function calling**: Invoking tools and parsing model responses
- **Conversation management**: Managing chat history (local or service-provided)
- **Structured output**: Extracting structured data from responses
- **Tool integration**: Seamlessly calling external tools and MCP servers

### 2. **Inference Service Requirements**

To use an inference service with Agent Framework, it must:

1. Provide an `IChatClient` implementation
2. Support the following capabilities:
   - Chat completion API
   - (Optional) Service-side chat history storage
   - (Optional) Function/tool calling capabilities
   - (Optional) Structured output support

### 3. **Supported Inference Services**

The framework provides built-in support for major services:

| Service | Agent Type | Chat History Options | Function Calling |
|---------|-----------|----------------------|------------------|
| **Microsoft Foundry Agent** | Native protocol | Service-provided | Yes |
| **Foundry Models** (ChatCompletion) | ChatClientAgent | In-memory only | Yes |
| **Foundry Models** (Responses) | ChatClientAgent | Both | Yes |
| **Foundry Anthropic** | ChatClientAgent | In-memory only | Yes |
| **Azure OpenAI** (ChatCompletion) | ChatClientAgent | In-memory only | Yes |
| **Azure OpenAI** (Responses) | ChatClientAgent | Both | Yes |
| **Anthropic** (Claude) | ChatClientAgent | In-memory only | Yes |
| **OpenAI** (ChatCompletion) | ChatClientAgent | In-memory only | Yes |
| **OpenAI** (Responses) | ChatClientAgent | Service-provided | Yes |
| **Any IChatClient** | ChatClientAgent | Varies | Varies |

### 4. **Creating Agents from Inference Services**

#### Basic Pattern

```csharp
// Step 1: Create a chat client for the inference service
var chatClient = new OpenAIClient(apiKey).AsChatClient(model: "gpt-4");

// Step 2: Wrap it in a ChatClientAgent
var agent = new ChatClientAgent(chatClient, instructions: "...");

// Step 3: Use the agent
var response = await agent.RunAsync("Your prompt");
```

#### With Azure OpenAI

```csharp
var chatClient = new AzureOpenAIClient(
    new Uri("https://<resource>.openai.azure.com/"),
    new AzureCliCredential()
).AsChatClient(model: "gpt-4");

var agent = new ChatClientAgent(chatClient, instructions: "...");
```

#### With Anthropic (Claude)

```csharp
var chatClient = new AnthropicClient(apiKey).AsChatClient(model: "claude-3-sonnet");

var agent = new ChatClientAgent(chatClient, instructions: "...");
```

## Out-of-the-Box Agent Capabilities

When you create a `ChatClientAgent`, you get these capabilities automatically:

### 1. **Function Calling**
Agents can automatically invoke tools based on the inference service's decision

### 2. **Multi-Turn Conversations**
- **Local chat history**: In-memory conversation tracking
- **Service-provided history**: Some services (Azure OpenAI Responses, OpenAI Responses) handle history server-side
- Flexible switching between modes

### 3. **Tool Integration**
- MCP (Model Context Protocol) servers
- Custom tools and functions
- Code execution capabilities

### 4. **Structured Output**
Extract and validate structured data from model responses

## Advanced Customization

### Custom IChatClient Implementations

If your inference service isn't directly supported, you can:

1. Create a custom `IChatClient` implementation
2. Use it with `ChatClientAgent`
3. Get full framework benefits

```csharp
// Any class implementing IChatClient can become an agent backend
var customChatClient = new MyCustomChatClientImplementation();
var agent = new ChatClientAgent(customChatClient, instructions: "...");
```

### Custom Agents

For complete control, extend the `AIAgent` base class:

```csharp
public class MyCustomAgent : AIAgent
{
    // Full control over execution logic
    public override async Task<string> RunAsync(string prompt)
    {
        // Your custom implementation
    }
}
```

## Chat History Management

### Service-Provided Storage
Some inference services (Azure OpenAI Responses, OpenAI Responses) manage conversation history server-side:
- Automatic persistence
- Conversation recall
- Less client-side state management

### In-Memory/Custom Storage
Most services require local history management:
- Track conversation state in your application
- Implement custom persistence (database, cache, etc.)
- More control over data

## Key Design Principles

1. **Abstraction**: `IChatClient` abstraction enables service-agnostic agents
2. **Composition**: Agents are composed of inference services + tools + context
3. **Deterministic Loop**: All execution follows the structured agentic loop
4. **Type Safety**: Full type checking across the framework
5. **Enterprise Features**: Built-in telemetry, logging, and state management

## Decision Tree: Choosing an Inference Service

```
┌─ Do you need service-managed chat history?
│  ├─ YES → Use Azure OpenAI Responses or OpenAI Responses
│  └─ NO  → ┌─ What's your cloud preference?
│           ├─ Azure → Azure OpenAI or Microsoft Foundry
│           ├─ AWS   → Consider custom IChatClient
│           └─ Multi-cloud → OpenAI or Anthropic
│
└─ Do you have special requirements?
   ├─ Specific model vendor → Use their service directly
   └─ Want maximum control → Implement custom IChatClient
```

## Real-World Example: Multi-Service Agent

```csharp
// Same agent code, different backends
public class FlexibleAgent
{
    private readonly ChatClientAgent agent;
    
    // Initialize with any inference service
    public FlexibleAgent(IChatClient chatClient, string instructions)
    {
        agent = new ChatClientAgent(chatClient, instructions: instructions);
    }
    
    public async Task<string> ProcessRequest(string userInput)
    {
        return await agent.RunAsync(userInput);
    }
}

// Usage
var openaiClient = new OpenAIClient(openaiKey).AsChatClient("gpt-4");
var openaiAgent = new FlexibleAgent(openaiClient, "Be helpful");

var azureClient = new AzureOpenAIClient(azureUri, creds).AsChatClient("gpt-4");
var azureAgent = new FlexibleAgent(azureClient, "Be helpful");

// Both agents have identical behavior, different backends
```

## Next Steps

- Review **[Service Configuration Guide](./service-configuration.md)** for specific setup instructions
- Explore **[Tool Integration](./tool-integration.md)** for adding capabilities
- Study **[Context Providers](./context-providers.md)** for advanced customization
- Learn about **[Workflows](./workflows.md)** for multi-agent scenarios

## Key Takeaway

**Agents in the Microsoft Agent Framework are fundamentally wrappers around inference services.** The framework provides:
- A consistent abstraction (`IChatClient`) for any inference service
- Standardized agent execution (`ChatClientAgent` with the agentic loop)
- Out-of-the-box capabilities (tools, history, structured output)
- Full flexibility for custom implementations when needed

This design enables you to build sophisticated AI applications that are both service-agnostic and enterprise-ready.
