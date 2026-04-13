using Microsoft.Extensions.AI;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Agents;

/// <summary>
/// Agent that researches current market trends and identifies pain points
/// </summary>
public class MarketResearchAgent : IMarketingAgent<MarketAnalysis>
{
    private readonly IChatClient _chatClient;
    private readonly ILogger<MarketResearchAgent> _logger;

    public string Name => "Market Research Agent";
    public string Description => "Researches market trends and identifies pain points for financial services enterprises";

    private static readonly string SystemPrompt = @"You are a market research expert analyzing current trends in financial technology, cloud infrastructure, and enterprise digital transformation.

Your task is to:
1. Identify current market trends relevant to enterprises
2. Highlight pain points that enterprises face
3. Identify specific market segments and opportunities
4. Focus on financial services, insurance, telecom, and energy sectors

Always return your analysis in valid JSON format with the following structure:
{
  ""market_insights"": [
    {
      ""trend"": ""string"",
      ""pain_point"": ""string"",
      ""market_segment"": ""string"",
      ""relevance_to_fintech"": ""high|medium|low"",
      ""opportunity_description"": ""string""
    }
  ],
  ""summary"": ""string"",
  ""trends"": [""string""],
  ""pain_points"": [""string""]
}

Be specific, data-driven, and focus on enterprise-level challenges. Ensure all JSON is properly formatted.";

    public MarketResearchAgent(IChatClient chatClient, ILogger<MarketResearchAgent> logger)
    {
        _chatClient = chatClient;
        _logger = logger;
    }

    public async Task<dynamic> ExecuteAsync()
    {
        return await ExecuteAsyncTyped();
    }

    public async Task<MarketAnalysis> ExecuteAsyncTyped()
    {
        _logger.LogInformation("Starting Market Research Agent");

        try
        {
            // Create chat messages
            var messages = new List<ChatMessage>
            {
                new ChatMessage(ChatRole.System, SystemPrompt),
                new ChatMessage(ChatRole.User, @"Analyze current market trends for enterprise IT decision makers.
Focus on:
- Cloud cost optimization challenges
- AI adoption in regulated industries
- Enterprise digital transformation needs
- Emerging technologies enterprises are evaluating

Provide insights that would be relevant to financial services, insurance, and telecom companies.")
            };

            _logger.LogInformation("Sending request to Foundry for market research");

            // Call Foundry through IChatClient
            var response = await _chatClient.GetResponseAsync(messages);

            var analysisText = response.Text;
            _logger.LogInformation($"Received response from Foundry: {analysisText.Substring(0, Math.Min(200, analysisText.Length))}...");

            // Parse JSON response
            var jsonStartIndex = analysisText.IndexOf('{');
            var jsonEndIndex = analysisText.LastIndexOf('}');

            if (jsonStartIndex < 0 || jsonEndIndex < 0)
            {
                _logger.LogError("No JSON found in response");
                return CreateMockAnalysis();
            }

            var jsonString = analysisText.Substring(jsonStartIndex, jsonEndIndex - jsonStartIndex + 1);
            var analysis = JsonSerializer.Deserialize<MarketAnalysis>(jsonString);

            if (analysis == null)
            {
                _logger.LogError("Failed to deserialize market analysis");
                return CreateMockAnalysis();
            }

            analysis.Timestamp = DateTime.UtcNow;
            _logger.LogInformation($"Market Research completed with {analysis.MarketInsights.Count} insights");
            return analysis;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in Market Research Agent: {ex.Message}");
            return CreateMockAnalysis();
        }
    }

    /// <summary>
    /// Create mock analysis for testing/fallback
    /// </summary>
    private static MarketAnalysis CreateMockAnalysis()
    {
        return new MarketAnalysis
        {
            Timestamp = DateTime.UtcNow,
            Summary = "The enterprise market is currently defined by a 'efficiency-first' AI strategy. Decision makers in Finance and Telecom are moving past experimental GenAI to focus on Cloud Cost Optimization (FinOps) and governed Agentic AI workflows that prove measurable ROI.",
            Trends = new()
            {
                "Shift from experimental to production-grade Agentic AI",
                "Hyper-focus on Cloud Cost Management (FinOps) due to 30% average waste",
                "Increasing regulatory pressure for AI transparency and human-in-the-loop",
                "Consolidation of AI platforms within the Microsoft ecosystem",
                "Rise of specialized multi-agent systems for back-office automation"
            },
            PainPoints = new()
            {
                "Predictable AI costs are difficult to model in pay-as-you-go environments",
                "Data sovereignty concerns in highly regulated financial sectors",
                "Skills gap in managing complex multi-agent orchestrations",
                "Integrating legacy infrastructure with modern Microsoft Agent Framework",
                "Lack of governance for autonomous AI agents acting on sensitive data"
            },
            MarketInsights = new()
            {
                new MarketInsight
                {
                    Trend = "Cloud Cost Management Acceleration",
                    PainPoint = "Enterprises are spending 25-40% more than necessary on cloud resources without clear observability.",
                    MarketSegment = "Financial Services, Telecom, Insurance",
                    Relevance = "high",
                    OpportunityDescription = "Finabeo's FinOps implementation can reduce waste by 30% in 90 days, funding future AI projects."
                },
                new MarketInsight
                {
                    Trend = "Regulated AI Adoption (Agentic AI)",
                    PainPoint = "Banks and insurers are hesitant to deploy autonomous agents due to compliance risks.",
                    MarketSegment = "Financial Services, Legal, Insurance",
                    Relevance = "high",
                    OpportunityDescription = "Finabeo's 'Human-in-the-Loop' orchestration ensures every automated decision is audited and approved."
                },
                new MarketInsight
                {
                    Trend = "Microsoft Ecosystem Synergy",
                    PainPoint = "Disconnected AI tools create technical debt and security vulnerabilities.",
                    MarketSegment = "Enterprise IT",
                    Relevance = "medium",
                    OpportunityDescription = "Leveraging Azure AI Foundry and Microsoft Agent Framework ensures seamless, secure integration."
                }
            }
        };
    }
}
