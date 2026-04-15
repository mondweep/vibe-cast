using Microsoft.Extensions.AI;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Agents;

/// <summary>
/// Maps a company's service catalog to identified market needs.
///
/// Two construction modes (both supported for backwards compatibility):
///
///   1. <c>new ServiceAlignmentAgent(chatClient, company, logger)</c>
///      Classic prompt-injection: the full service catalog is serialised into the
///      system prompt up-front. Works against any IChatClient.
///
///   2. <c>new ServiceAlignmentAgent(chatClient, companyId, tools, logger)</c>
///      Tool-calling mode: the agent only knows the companyId and is given a toolset.
///      It decides when to call <c>GetCompanyServices</c>, <c>GetCompanyVoice</c>, etc.
///      Requires the chatClient to be wrapped with <c>UseFunctionInvocation()</c>.
///
/// The tool-calling path exists to demonstrate Microsoft.Extensions.AI's function-
/// invocation pattern. In practice both paths produce equivalent output for this
/// task, but the tool path scales better — agents can introspect data on demand
/// rather than receiving the universe up front.
/// </summary>
public class ServiceAlignmentAgent : IMarketingAgent<ServiceAlignment>
{
    private readonly IChatClient _chatClient;
    private readonly ILogger<ServiceAlignmentAgent> _logger;

    // Mode 1: classic prompt injection
    private readonly Company? _company;

    // Mode 2: tool calling
    private readonly string? _companyId;
    private readonly IList<AITool>? _tools;

    public string Name => $"{(_company?.Name ?? _companyId ?? "Unknown")} Service Alignment Agent";
    public string Description => "Aligns services with identified market needs and opportunities";

    /// <summary>Classic mode: services injected via system prompt.</summary>
    public ServiceAlignmentAgent(IChatClient chatClient, Company company, ILogger<ServiceAlignmentAgent> logger)
    {
        _chatClient = chatClient;
        _company = company;
        _logger = logger;
    }

    /// <summary>
    /// Tool-calling mode: agent fetches services on demand via the supplied tools.
    /// The chatClient MUST already be wrapped with <c>.AsBuilder().UseFunctionInvocation().Build()</c>.
    /// </summary>
    public ServiceAlignmentAgent(
        IChatClient chatClient,
        string companyId,
        IList<AITool> tools,
        ILogger<ServiceAlignmentAgent> logger)
    {
        _chatClient = chatClient;
        _companyId = companyId;
        _tools = tools;
        _logger = logger;
    }

    public async Task<dynamic> ExecuteAsync()
    {
        return await ExecuteAsyncTyped();
    }

    public async Task<ServiceAlignment> ExecuteAsyncTyped()
    {
        if (_tools is not null && _companyId is not null)
            return await ExecuteWithToolCallingAsync(_companyId);

        if (_company is not null)
            return await ExecuteWithPromptInjectionAsync(_company);

        throw new InvalidOperationException(
            "ServiceAlignmentAgent has no company context — neither classic nor tool-calling constructor was used correctly.");
    }

    // ─── Classic path (services in system prompt) ───

    private async Task<ServiceAlignment> ExecuteWithPromptInjectionAsync(Company company)
    {
        _logger.LogInformation("Service Alignment Agent (classic mode) for {Company}", company.Name);

        var servicesJson = JsonSerializer.Serialize(company.Services);
        var industries = string.Join(", ", company.TargetIndustries);

        var systemPrompt = $@"You are a business strategist analyzing how {company.Name}'s services solve market pain points.

Company: {company.Name}
What they do: {company.Description}
Primary target industries: {industries}
Brand voice: {company.Voice}

Service catalog:
{servicesJson}

Your task is to:
1. Analyze how each service addresses market needs in the target industries above
2. Score alignment (0.0-1.0) for each service
3. Identify content themes and angles consistent with the brand voice
4. Recommend which service(s) to focus on this week

Return valid JSON in this shape (the property name 'finabeo_services' is a legacy schema field — populate it with this company's services regardless of company name):
{AlignmentJsonSchema}";

        var userPrompt = $@"For {company.Name} this week, given the current market conditions in {industries}, which service should we lead with?

Be specific about the pain point each service solves, the decision-makers in those industries who feel that pain, and a content angle that fits the brand voice ({company.Voice}).";

        var response = await _chatClient.GetResponseAsync(new List<ChatMessage>
        {
            new ChatMessage(ChatRole.System, systemPrompt),
            new ChatMessage(ChatRole.User, userPrompt)
        });

        return ParseResponse(response.Text, fallbackBuilder: () => CreateMockAlignmentFromCompany(company));
    }

    // ─── Tool-calling path (services fetched on demand) ───

    private async Task<ServiceAlignment> ExecuteWithToolCallingAsync(string companyId)
    {
        _logger.LogInformation("Service Alignment Agent (tool-calling mode) for {CompanyId}", companyId);

        var systemPrompt = $@"You are a business strategist working for the company with id '{companyId}'.

You have these tools available — use them as needed:
- GetCompanyServices(companyId): full service catalog (you will need this)
- GetCompanyTargetIndustries(companyId): industries they primarily serve
- GetCompanyVoice(companyId): brand voice / tone description

Workflow:
1. Call GetCompanyServices and GetCompanyTargetIndustries to gather context
2. (Optional) call GetCompanyVoice to match brand tone
3. Analyze how each service addresses market needs
4. Score alignment (0.0-1.0) for each service
5. Identify content themes
6. Recommend which service(s) to focus on this week

After tool calls, return your final answer as valid JSON in this shape:
{AlignmentJsonSchema}";

        var userPrompt = $@"For company '{companyId}' this week, given current market conditions, which service should we lead with?

Be specific about the pain point each service solves, the decision-makers who feel that pain, and a content angle that fits the brand voice. Use the tools to fetch what you need.";

        var options = new ChatOptions { Tools = _tools };

        var response = await _chatClient.GetResponseAsync(
            new List<ChatMessage>
            {
                new ChatMessage(ChatRole.System, systemPrompt),
                new ChatMessage(ChatRole.User, userPrompt)
            },
            options);

        return ParseResponse(response.Text, fallbackBuilder: CreateMockAlignmentFallback);
    }

    // ─── Shared parsing & fallback helpers ───

    private const string AlignmentJsonSchema = @"{
  ""finabeo_services"": [
    {
      ""service_name"": ""string"",
      ""target_market"": ""string"",
      ""alignment_score"": 0.85,
      ""why_fit"": ""string"",
      ""key_benefits_to_highlight"": [""string""],
      ""suggested_angle"": ""string""
    }
  ],
  ""recommended_focus"": ""string"",
  ""content_themes"": [""string""],
  ""summary"": ""string""
}";

    private ServiceAlignment ParseResponse(string text, Func<ServiceAlignment> fallbackBuilder)
    {
        try
        {
            _logger.LogInformation("Received alignment response: {Preview}...",
                text.Substring(0, Math.Min(200, text.Length)));

            var jsonStart = text.IndexOf('{');
            var jsonEnd = text.LastIndexOf('}');
            if (jsonStart < 0 || jsonEnd < 0)
            {
                _logger.LogError("No JSON found in alignment response — using fallback");
                return fallbackBuilder();
            }

            var parsed = JsonSerializer.Deserialize<JsonElement>(text[jsonStart..(jsonEnd + 1)]);

            var alignment = new ServiceAlignment
            {
                Timestamp = DateTime.UtcNow,
                RecommendedFocus = parsed.GetProperty("recommended_focus").GetString() ?? string.Empty,
                Summary = parsed.GetProperty("summary").GetString() ?? string.Empty
            };

            if (parsed.TryGetProperty("finabeo_services", out var servicesElement))
            {
                foreach (var s in servicesElement.EnumerateArray())
                {
                    var rec = new ServiceRecommendation
                    {
                        ServiceName = s.GetProperty("service_name").GetString() ?? string.Empty,
                        TargetMarket = s.GetProperty("target_market").GetString() ?? string.Empty,
                        AlignmentScore = s.GetProperty("alignment_score").GetDouble(),
                        WhyFit = s.GetProperty("why_fit").GetString() ?? string.Empty,
                        SuggestedAngle = s.GetProperty("suggested_angle").GetString() ?? string.Empty
                    };
                    if (s.TryGetProperty("key_benefits_to_highlight", out var b))
                    {
                        rec.KeyBenefitsToHighlight = b.EnumerateArray()
                            .Select(x => x.GetString() ?? string.Empty).ToList();
                    }
                    alignment.FinabeoServices.Add(rec);
                }
            }

            if (parsed.TryGetProperty("content_themes", out var themes))
            {
                alignment.ContentThemes = themes.EnumerateArray()
                    .Select(t => t.GetString() ?? string.Empty).ToList();
            }

            _logger.LogInformation("Alignment completed with {Count} service recommendations",
                alignment.FinabeoServices.Count);
            return alignment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing alignment response — using fallback");
            return fallbackBuilder();
        }
    }

    private ServiceAlignment CreateMockAlignmentFromCompany(Company company) => new()
    {
        Timestamp = DateTime.UtcNow,
        RecommendedFocus = company.Services.FirstOrDefault() is { } first
            ? $"Lead with {first.Name} — addresses the most acute current pain point for {company.Name}'s target industries."
            : $"Focus on {company.Name}'s flagship offering this week.",
        Summary = $"Alignment agent fallback: {company.Name} has {company.Services.Count} service(s). " +
                  "The LLM response could not be parsed, so this is a placeholder.",
        ContentThemes = company.Services.Select(s => s.Name).ToList(),
        FinabeoServices = company.Services.Select(s => new ServiceRecommendation
        {
            ServiceName = s.Name,
            TargetMarket = string.Join(", ", s.TargetIndustries),
            AlignmentScore = 0.85,
            WhyFit = s.Description,
            KeyBenefitsToHighlight = s.Benefits,
            SuggestedAngle = s.KeyDifferentiator
        }).ToList()
    };

    private ServiceAlignment CreateMockAlignmentFallback() => new()
    {
        Timestamp = DateTime.UtcNow,
        RecommendedFocus = $"Tool-calling fallback for company '{_companyId}' — LLM response was unparseable.",
        Summary = "Tool-calling alignment agent could not get a valid response; placeholder used."
    };
}
