using Microsoft.Agents.AI;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Agents;

/// <summary>
/// Agent that maps Finabeo services to market needs
/// </summary>
public class FinabeoAlignmentAgent : IMarketingAgent<ServiceAlignment>
{
    private readonly IChatClient _chatClient;
    private readonly List<FinabeoService> _finabeoServices;
    private readonly ILogger<FinabeoAlignmentAgent> _logger;

    public string Name => "Finabeo Alignment Agent";
    public string Description => "Aligns Finabeo services with identified market needs and opportunities";

    public FinabeoAlignmentAgent(IChatClient chatClient, List<FinabeoService> finabeoServices, ILogger<FinabeoAlignmentAgent> logger)
    {
        _chatClient = chatClient;
        _finabeoServices = finabeoServices;
        _logger = logger;
    }

    public async Task<dynamic> ExecuteAsync()
    {
        return await ExecuteAsyncTyped();
    }

    public async Task<ServiceAlignment> ExecuteAsyncTyped()
    {
        _logger.LogInformation("Starting Finabeo Alignment Agent");

        try
        {
            var servicesJson = JsonSerializer.Serialize(_finabeoServices);

            var systemPrompt = $@"You are a business strategist analyzing how Finabeo services solve market pain points.

Finabeo Services:
{servicesJson}

Your task is to:
1. Analyze how each Finabeo service addresses market needs
2. Score alignment (0.0-1.0) for each service
3. Identify content themes and angles
4. Recommend which service(s) to focus on

Return valid JSON:
{{
  ""finabeo_services"": [
    {{
      ""service_name"": ""string"",
      ""target_market"": ""string"",
      ""alignment_score"": 0.85,
      ""why_fit"": ""string"",
      ""key_benefits_to_highlight"": [""string""],
      ""suggested_angle"": ""string""
    }}
  ],
  ""recommended_focus"": ""string"",
  ""content_themes"": [""string""],
  ""summary"": ""string""
}}";

            var messages = new List<ChatMessage>
            {
                new ChatMessage(ChatRole.System, systemPrompt),
                new ChatMessage(ChatRole.User, @"Based on current market trends showing enterprises struggling with:
- Cloud cost optimization (25-40% waste)
- Safe AI adoption in regulated environments
- Digital transformation with governance concerns

How do Finabeo services address these needs?
What content angles would resonate with financial services, insurance, and telecom decision makers?
Which service should we focus on this week?")
            };

            _logger.LogInformation("Sending request to Foundry for service alignment");

            var response = await _chatClient.CompleteAsync(messages);
            var alignmentText = response.Message.Content;

            _logger.LogInformation($"Received alignment response: {alignmentText.Substring(0, Math.Min(200, alignmentText.Length))}...");

            // Parse JSON
            var jsonStartIndex = alignmentText.IndexOf('{');
            var jsonEndIndex = alignmentText.LastIndexOf('}');

            if (jsonStartIndex < 0 || jsonEndIndex < 0)
            {
                _logger.LogError("No JSON found in alignment response");
                return CreateMockAlignment();
            }

            var jsonString = alignmentText.Substring(jsonStartIndex, jsonEndIndex - jsonStartIndex + 1);
            var parsed = JsonSerializer.Deserialize<JsonElement>(jsonString);

            var alignment = new ServiceAlignment
            {
                Timestamp = DateTime.UtcNow,
                RecommendedFocus = parsed.GetProperty("recommended_focus").GetString() ?? string.Empty,
                Summary = parsed.GetProperty("summary").GetString() ?? string.Empty
            };

            // Parse services
            if (parsed.TryGetProperty("finabeo_services", out var servicesElement))
            {
                foreach (var serviceJson in servicesElement.EnumerateArray())
                {
                    var service = new ServiceRecommendation
                    {
                        ServiceName = serviceJson.GetProperty("service_name").GetString() ?? string.Empty,
                        TargetMarket = serviceJson.GetProperty("target_market").GetString() ?? string.Empty,
                        AlignmentScore = serviceJson.GetProperty("alignment_score").GetDouble(),
                        WhyFit = serviceJson.GetProperty("why_fit").GetString() ?? string.Empty,
                        SuggestedAngle = serviceJson.GetProperty("suggested_angle").GetString() ?? string.Empty
                    };

                    if (serviceJson.TryGetProperty("key_benefits_to_highlight", out var benefitsElement))
                    {
                        service.KeyBenefits = benefitsElement.EnumerateArray()
                            .Select(b => b.GetString() ?? string.Empty)
                            .ToList();
                    }

                    alignment.FinabeoServices.Add(service);
                }
            }

            // Parse themes
            if (parsed.TryGetProperty("content_themes", out var themesElement))
            {
                alignment.ContentThemes = themesElement.EnumerateArray()
                    .Select(t => t.GetString() ?? string.Empty)
                    .ToList();
            }

            _logger.LogInformation($"Alignment completed with {alignment.FinabeoServices.Count} service recommendations");
            return alignment;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in Alignment Agent: {ex.Message}");
            return CreateMockAlignment();
        }
    }

    private static ServiceAlignment CreateMockAlignment()
    {
        return new ServiceAlignment
        {
            Timestamp = DateTime.UtcNow,
            RecommendedFocus = "Cloud Cost Management is primary focus, with Agentic AI as secondary angle",
            Summary = "Both Finabeo services directly address current market pain points",
            ContentThemes = new()
            {
                "How enterprises can achieve 25-40% cloud cost savings",
                "Safe AI adoption with human oversight",
                "Microsoft ecosystem readiness for Agentic AI",
                "Governance-first approach to automation"
            },
            FinabeoServices = new()
            {
                new ServiceRecommendation
                {
                    ServiceName = "Cloud Cost Management",
                    TargetMarket = "Financial Services, Telecom, Insurance",
                    AlignmentScore = 0.95,
                    WhyFit = "Directly addresses the 25-40% cloud waste pain point enterprises are facing",
                    KeyBenefits = new() { "Measurable savings", "Fast ROI", "Governance focus" },
                    SuggestedAngle = "How to eliminate cloud waste without vendor lock-in"
                },
                new ServiceRecommendation
                {
                    ServiceName = "Agentic AI Transformation",
                    TargetMarket = "Financial Services, Legal, Insurance",
                    AlignmentScore = 0.88,
                    WhyFit = "Addresses the challenge of safe AI adoption in regulated environments",
                    KeyBenefits = new() { "Human-in-the-loop", "Compliance-ready", "Enterprise governance" },
                    SuggestedAngle = "Microsoft ecosystem proves it can deliver Agentic AI with enterprise governance"
                }
            }
        };
    }
}
