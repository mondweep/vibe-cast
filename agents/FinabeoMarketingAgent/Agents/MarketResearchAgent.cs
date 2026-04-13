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
            var response = await _chatClient.CompleteAsync(messages);

            var analysisText = response.Message.Content;
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
            Summary = "Current market trends show enterprises struggling with cloud cost optimization and AI adoption in regulated environments.",
            Trends = new()
            {
                "Increased focus on cloud cost optimization",
                "Growing adoption of AI in regulated industries",
                "Enterprise digital transformation acceleration",
                "Security and compliance become critical"
            },
            PainPoints = new()
            {
                "Cloud cost unpredictability and waste",
                "Difficulty adopting AI due to regulatory concerns",
                "Complex multi-cloud management",
                "Data governance and compliance challenges"
            },
            MarketInsights = new()
            {
                new MarketInsight
                {
                    Trend = "Cloud Cost Optimization",
                    PainPoint = "Enterprises waste 25-40% on cloud resources",
                    MarketSegment = "Financial Services, Telecom, Insurance",
                    Relevance = "high",
                    OpportunityDescription = "Need for FinOps consulting and optimization tools"
                },
                new MarketInsight
                {
                    Trend = "Agentic AI Adoption",
                    PainPoint = "Organizations struggle with safe AI deployment in regulated environments",
                    MarketSegment = "Financial Services, Legal, Insurance",
                    Relevance = "high",
                    OpportunityDescription = "Demand for human-in-the-loop, governed AI solutions"
                }
            }
        };
    }
}
