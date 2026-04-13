# Finabeo Marketing Agent - Implementation Guide

## Quick Start (This Week)

### Prerequisites

- .NET 8 SDK
- Visual Studio 2022 or VS Code
- Azure account with OpenAI deployed (or access to Foundry)
- Git

### Step 1: Project Setup

```bash
# Create new solution
dotnet new sln -n FinabeoMarketingAgent

# Create main project
dotnet new console -n FinabeoMarketingAgent.Core -f net8.0
cd FinabeoMarketingAgent.Core

# Add to solution
cd ..
dotnet sln FinabeoMarketingAgent.sln add FinabeoMarketingAgent.Core/FinabeoMarketingAgent.Core.csproj
```

### Step 2: Install NuGet Packages

```bash
cd FinabeoMarketingAgent.Core

# Agent Framework
dotnet add package Microsoft.Agents.AI.Foundry --prerelease
dotnet add package Microsoft.Agents.AI --prerelease

# Azure OpenAI
dotnet add package Azure.AI.OpenAI --prerelease

# Utilities
dotnet add package Microsoft.Extensions.Configuration
dotnet add package Microsoft.Extensions.Configuration.Json
dotnet add package Microsoft.Extensions.DependencyInjection
dotnet add package System.Text.Json

# Optional: for structured outputs
dotnet add package System.ComponentModel.DataAnnotations
```

### Step 3: Configure Azure OpenAI

Create `appsettings.json`:

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "ApiKey": "<your-api-key>",
    "DeploymentName": "gpt-4o",
    "ModelName": "gpt-4o"
  },
  "Finabeo": {
    "Website": "https://www.finabeo.com",
    "Services": [
      {
        "Name": "Cloud Cost Management",
        "Description": "Enterprise FinOps consulting with custom tools",
        "TargetMarket": "Enterprises with $50k+ cloud spend",
        "ValueProposition": "25-40% cloud cost savings in first year"
      },
      {
        "Name": "Agentic AI Transformation",
        "Description": "Safe, human-in-the-loop workflow automation",
        "TargetMarket": "Enterprises seeking digital transformation",
        "ValueProposition": "Seamless technology integration with governance"
      }
    ]
  }
}
```

---

## Core Architecture

### Project Structure

```
FinabeoMarketingAgent.Core/
├── Program.cs
├── appsettings.json
├── Agents/
│   ├── IMarketingAgent.cs          (interface)
│   ├── MarketResearchAgent.cs
│   ├── FinabeoAlignmentAgent.cs
│   └── ContentGenerationAgent.cs
├── Tools/
│   ├── IToolProvider.cs
│   ├── MarketResearchTools.cs
│   ├── FinabeoTools.cs
│   └── ContentGenerationTools.cs
├── Models/
│   ├── MarketAnalysis.cs
│   ├── ServiceAlignment.cs
│   ├── GeneratedContent.cs
│   └── Enums.cs
├── ContextProviders/
│   └── FinabeoKnowledgeProvider.cs
├── Workflow/
│   └── MarketingAgentWorkflow.cs
├── Config/
│   ├── AgentConfig.cs
│   └── AzureOpenAIConfig.cs
└── Utils/
    └── JsonHelper.cs
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Day 1-2)

**Deliverables**:
- Project structure
- Azure OpenAI configuration
- Base agent interfaces
- Configuration loading

**Files to create**:
- `Program.cs` - Entry point
- `Config/AzureOpenAIConfig.cs` - Configuration
- `Config/AgentConfig.cs` - Agent settings
- `Models/` - Data models
- `Agents/IMarketingAgent.cs` - Base interface

### Phase 2: Agent Implementations (Day 3-5)

**Deliverables**:
- Market Research Agent
- Finabeo Alignment Agent
- Content Generation Agent

**Each agent includes**:
- Tool definitions
- Structured output validation
- Error handling
- Logging

### Phase 3: Workflow Orchestration (Day 5-6)

**Deliverables**:
- Workflow coordinator
- Agent sequencing
- Result aggregation
- Output formatting

### Phase 4: Testing & Polish (Day 6-7)

**Deliverables**:
- End-to-end testing
- Sample output generation
- Documentation
- Error handling

---

## Finabeo Service Configuration

### Services to Configure

**Service 1: Cloud Cost Management**
```csharp
new FinabeoService {
    Id = "cloud-cost-management",
    Name = "Cloud Cost Management",
    Description = "Enterprise FinOps consulting with custom tools to identify waste",
    Benefits = new[] {
        "25-40% cloud cost savings in first year",
        "ROI within 3-6 months",
        "Tailored recommendations addressing business strategy",
        "Read-only cloud access without PII exposure"
    },
    TargetIndustries = new[] {
        "Financial Services", "Legal/Professional Services", 
        "Energy/Utilities", "Insurance", "Telecom"
    },
    TargetCustomerSize = "Enterprises with $50k+ annual cloud spend",
    KeyDifferentiator = "Human-led, Tech-driven approach with governance focus"
}
```

**Service 2: Agentic AI Transformation**
```csharp
new FinabeoService {
    Id = "agentic-ai-transformation",
    Name = "Agentic AI Transformation",
    Description = "Safe, human-in-the-loop workflow automation",
    Benefits = new[] {
        "Seamless technology integration",
        "Enterprise process transformation",
        "Real-time data integration",
        "Multi-agent orchestration with human oversight"
    },
    TargetIndustries = new[] {
        "Financial Services", "Legal/Professional Services",
        "Energy/Utilities", "Insurance", "Telecom"
    },
    TargetCustomerSize = "Digital transformation-ready enterprises",
    KeyDifferentiator = "Human-in-the-loop governance and accountability"
}
```

---

## Tool Specifications

### Market Research Tools

**Tool 1: SearchMarketTrends**
```
Input: None
Output: {
  "trends": ["string"],
  "pain_points": ["string"],
  "opportunities": ["string"]
}
```

**Tool 2: AnalyzeTrends**
```
Input: { "raw_trends": ["string"] }
Output: {
  "market_insights": [
    {
      "trend": "string",
      "pain_point": "string",
      "market_segment": "string",
      "relevance": "high|medium|low"
    }
  ]
}
```

### Content Generation Tools

**Tools**: GenerateLinkedInContent, GenerateTwitterContent, GenerateInstagramContent, GenerateBlogContent

Each takes:
```
Input: {
  "market_analysis": { /* market context */ },
  "finabeo_services": [ /* relevant services */ ],
  "tone": "string"
}
Output: {
  "content": "string",
  "hashtags": ["string"],
  "metadata": { /* platform-specific */ }
}
```

---

## Sample Output Format

```json
{
  "generated_at": "2024-04-13T08:30:00Z",
  "workflow_status": "completed",
  "content": {
    "linkedin": {
      "post": "Did you know? Enterprises are struggling with cloud cost optimization...",
      "hashtags": ["#CloudOptimization", "#FinOps"],
      "optimal_posting_time": "Tuesday 9 AM UTC"
    },
    "twitter": {
      "thread": [
        { "tweet": "🚀 Cloud costs spiraling? You're not alone...", "order": 1 },
        { "tweet": "The average enterprise can save 25-40% in the first year alone", "order": 2 }
      ],
      "hashtags": ["#Cloud", "#FinOps"]
    },
    "instagram": {
      "caption": "Enterprise cloud optimization doesn't have to be complex...",
      "hashtags": ["#CloudOptimization", "#EnterpriseIT"],
      "visual_brief": "Infographic: Cloud cost savings journey"
    },
    "blog": {
      "title": "How Enterprises Save 25-40% on Cloud Costs in Year One",
      "meta_description": "Discover proven strategies for enterprise cloud optimization...",
      "word_count": 1850,
      "seo_keywords": ["cloud cost optimization", "FinOps", "Azure cost management"]
    }
  },
  "metadata": {
    "market_focus": "Cloud cost optimization in financial services",
    "finabeo_services_featured": ["Cloud Cost Management"],
    "quality_score": 0.92
  }
}
```

---

## Development Workflow

### Build Process
```bash
dotnet build
dotnet run
```

### Running Individual Agents
```bash
# For testing individual agents
dotnet run -- --agent=research
dotnet run -- --agent=alignment
dotnet run -- --agent=content
```

### Running Full Workflow
```bash
dotnet run -- --workflow=full
```

### Output
```bash
# Files will be created in /output
output/
├── market-analysis-{date}.json
├── alignment-analysis-{date}.json
└── generated-content-{date}.json
```

---

## Testing Strategy

### Unit Tests
```csharp
[TestClass]
public class MarketResearchAgentTests
{
    [TestMethod]
    public async Task SearchMarketTrends_ReturnsValidResults()
    {
        // Arrange
        var agent = new MarketResearchAgent(mockClient);
        
        // Act
        var results = await agent.ExecuteAsync();
        
        // Assert
        Assert.IsNotNull(results);
        Assert.IsTrue(results.Trends.Count > 0);
    }
}
```

### Integration Tests
```csharp
[TestClass]
public class WorkflowTests
{
    [TestMethod]
    public async Task FullWorkflow_GeneratesAllContentTypes()
    {
        // Test complete workflow
        var workflow = new MarketingAgentWorkflow(config);
        var result = await workflow.ExecuteAsync();
        
        Assert.IsNotNull(result.Content.LinkedIn);
        Assert.IsNotNull(result.Content.Twitter);
        Assert.IsNotNull(result.Content.Instagram);
        Assert.IsNotNull(result.Content.Blog);
    }
}
```

---

## Debugging Tips

### Enable Verbose Logging
```csharp
var services = new ServiceCollection()
    .AddLogging(builder => {
        builder.AddConsole();
        builder.SetMinimumLevel(LogLevel.Debug);
    })
    .BuildServiceProvider();
```

### Mock Azure OpenAI for Testing
```csharp
var mockChatClient = new Mock<IChatClient>();
mockChatClient
    .Setup(c => c.CompleteAsync(It.IsAny<IEnumerable<ChatMessage>>()))
    .ReturnsAsync(new ChatCompletion(...));
```

### Check Response Format
```csharp
// Validate JSON before processing
try {
    var parsed = JsonSerializer.Deserialize<T>(response);
}
catch (JsonException ex) {
    logger.LogError($"Invalid JSON response: {ex.Message}");
}
```

---

## Success Checklist - Week 1 MVP

- [ ] Project created and builds successfully
- [ ] Azure OpenAI connection configured and tested
- [ ] Market Research Agent implemented and tested
- [ ] Finabeo Alignment Agent implemented and tested
- [ ] Content Generation Agent implemented and tested
- [ ] Workflow orchestrator wires agents together
- [ ] Full workflow runs end-to-end
- [ ] Generates valid JSON output for all 4 content types
- [ ] Code is documented with XML comments
- [ ] Output saved to files for review

---

## Troubleshooting

### "Azure OpenAI endpoint not found"
- Check `appsettings.json` configuration
- Verify API key and endpoint URL
- Test with Azure CLI: `az cognitiveservices account list`

### "Agent response not in expected format"
- Add response validation
- Log full response before parsing
- Check prompt instructions for format guidance

### "Too many requests" error
- Implement retry logic with exponential backoff
- Add rate limiting between tool calls
- Check Azure OpenAI quotas

---

## Next Steps

1. Create project structure
2. Configure Azure OpenAI
3. Implement first agent (Market Research)
4. Test and iterate
5. Add remaining agents
6. Build workflow
7. Polish and document

Ready to start coding? 🚀
