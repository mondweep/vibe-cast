using Microsoft.Extensions.AI;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Agents;

/// <summary>
/// Researches current market trends and pain points within a specific company's
/// target industries. Prompts are parameterised by the Company profile so the
/// same class serves Finabeo, Brigade Electronics, or any other tenant in the
/// registry without leaking terminology across companies.
/// </summary>
public class MarketResearchAgent : IMarketingAgent<MarketAnalysis>
{
    private readonly IChatClient _chatClient;
    private readonly Company _company;
    private readonly ILogger<MarketResearchAgent> _logger;

    public string Name => $"{_company.Name} Market Research Agent";
    public string Description => $"Researches market trends and pain points relevant to {_company.Name}'s target industries";

    public MarketResearchAgent(IChatClient chatClient, Company company, ILogger<MarketResearchAgent> logger)
    {
        _chatClient = chatClient;
        _company = company;
        _logger = logger;
    }

    public async Task<dynamic> ExecuteAsync() => await ExecuteAsyncTyped();

    public async Task<MarketAnalysis> ExecuteAsyncTyped()
    {
        _logger.LogInformation("Starting Market Research Agent for {Company}", _company.Name);

        var industries = _company.TargetIndustries.Count > 0
            ? string.Join(", ", _company.TargetIndustries)
            : "the company's target market";

        var systemPrompt = $@"You are a market research expert analysing current trends and pain points in the industries that {_company.Name} serves.

Company context:
  Name: {_company.Name}
  What they do: {_company.Description}
  Target industries: {industries}

Your task is to:
1. Identify current market trends affecting enterprises in the target industries above
2. Highlight concrete pain points those enterprises are facing right now
3. Identify specific market segments and opportunities {_company.Name} could address
4. Stay anchored in {_company.Name}'s actual target industries — do NOT drift into unrelated sectors. For example, if the company sells vehicle safety systems, do not generate fintech or cloud-cost insights.

Return ONLY valid JSON in this exact shape:
{{
  ""market_insights"": [
    {{
      ""trend"": ""string"",
      ""pain_point"": ""string"",
      ""market_segment"": ""string"",
      ""relevance_to_company"": ""high|medium|low"",
      ""opportunity_description"": ""string""
    }}
  ],
  ""summary"": ""string"",
  ""trends"": [""string""],
  ""pain_points"": [""string""]
}}

Be specific, data-driven, and focused on enterprise-level challenges in {industries}.";

        var userPrompt = $@"Analyse current market trends for decision-makers in {industries}.

Every insight must be anchored to {_company.Name}'s actual industries — {industries}.
Consider:
- Operational, regulatory, or commercial pressures those industries face today
- Concrete pain points that are unresolved or under-served
- Emerging opportunities a company described as: ""{_company.Description}"" could credibly address

Return at least 3 insights, each tied to a specific segment within {industries}. Valid JSON only.";

        try
        {
            var response = await _chatClient.GetResponseAsync(new List<ChatMessage>
            {
                new ChatMessage(ChatRole.System, systemPrompt),
                new ChatMessage(ChatRole.User, userPrompt)
            });

            var text = response.Text;
            _logger.LogInformation("Received research response ({Length} chars)", text.Length);

            var jsonStart = text.IndexOf('{');
            var jsonEnd = text.LastIndexOf('}');
            if (jsonStart < 0 || jsonEnd < 0)
            {
                _logger.LogError("No JSON found in research response — using fallback");
                return CreateMockAnalysis();
            }

            var parsed = JsonSerializer.Deserialize<JsonElement>(text[jsonStart..(jsonEnd + 1)]);

            var analysis = new MarketAnalysis
            {
                Timestamp = DateTime.UtcNow,
                Summary = parsed.TryGetProperty("summary", out var s) ? s.GetString() ?? string.Empty : string.Empty,
                Trends = parsed.TryGetProperty("trends", out var t)
                    ? t.EnumerateArray().Select(x => x.GetString() ?? string.Empty).ToList()
                    : new List<string>(),
                PainPoints = parsed.TryGetProperty("pain_points", out var p)
                    ? p.EnumerateArray().Select(x => x.GetString() ?? string.Empty).ToList()
                    : new List<string>()
            };

            if (parsed.TryGetProperty("market_insights", out var insights))
            {
                foreach (var insight in insights.EnumerateArray())
                {
                    // Accept either the new field name (relevance_to_company) or the legacy
                    // (relevance_to_fintech) so older snapshots still parse.
                    var relevance =
                        (insight.TryGetProperty("relevance_to_company", out var rc) ? rc.GetString() : null)
                        ?? (insight.TryGetProperty("relevance_to_fintech", out var rf) ? rf.GetString() : null)
                        ?? "medium";

                    analysis.MarketInsights.Add(new MarketInsight
                    {
                        Trend = insight.TryGetProperty("trend", out var tr) ? tr.GetString() ?? string.Empty : string.Empty,
                        PainPoint = insight.TryGetProperty("pain_point", out var pp) ? pp.GetString() ?? string.Empty : string.Empty,
                        MarketSegment = insight.TryGetProperty("market_segment", out var ms) ? ms.GetString() ?? string.Empty : string.Empty,
                        Relevance = relevance,
                        OpportunityDescription = insight.TryGetProperty("opportunity_description", out var od) ? od.GetString() ?? string.Empty : string.Empty
                    });
                }
            }

            _logger.LogInformation("Market research completed with {Count} insights for {Company}",
                analysis.MarketInsights.Count, _company.Name);
            return analysis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Market Research Agent — using fallback");
            return CreateMockAnalysis();
        }
    }

    private MarketAnalysis CreateMockAnalysis()
    {
        var industry = _company.TargetIndustries.FirstOrDefault() ?? "the target market";
        return new MarketAnalysis
        {
            Timestamp = DateTime.UtcNow,
            Summary = $"Fallback analysis for {_company.Name}: the LLM response was unparseable, so no real insights are available. Re-run the workflow to get a proper analysis.",
            Trends = new List<string> { $"Placeholder trend in {industry}" },
            PainPoints = new List<string> { $"Placeholder pain point in {industry}" },
            MarketInsights = new List<MarketInsight>
            {
                new()
                {
                    Trend = $"Placeholder trend for {industry}",
                    PainPoint = $"Placeholder pain point in {industry}",
                    MarketSegment = industry,
                    Relevance = "medium",
                    OpportunityDescription = $"Placeholder — re-run the agent to get real insights for {_company.Name}."
                }
            }
        };
    }
}
