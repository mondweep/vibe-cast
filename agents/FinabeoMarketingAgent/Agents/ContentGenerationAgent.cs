using Microsoft.Extensions.AI;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Agents;

/// <summary>
/// Generates marketing content (LinkedIn, Twitter, Instagram, blog) for a
/// specific company, using the market analysis and service-alignment output
/// from the earlier workflow steps as context. All positioning is driven by
/// the Company profile — no hardcoded Finabeo or fintech terminology.
/// </summary>
public class ContentGenerationAgent : IMarketingAgent<GeneratedContent>
{
    private readonly IChatClient _chatClient;
    private readonly Company _company;
    private readonly ILogger<ContentGenerationAgent> _logger;

    // Context from upstream agents, set before ExecuteAsync is called.
    private MarketAnalysis? _marketAnalysis;
    private ServiceAlignment? _serviceAlignment;

    public string Name => $"{_company.Name} Content Generation Agent";
    public string Description => $"Generates marketing content for {_company.Name} across LinkedIn, Twitter, Instagram, and blogs";

    public ContentGenerationAgent(IChatClient chatClient, Company company, ILogger<ContentGenerationAgent> logger)
    {
        _chatClient = chatClient;
        _company = company;
        _logger = logger;
    }

    /// <summary>
    /// Seed the agent with upstream context. Called by MarketingWorkflow between the
    /// alignment and content steps so prompts can be built from real market + service data
    /// rather than hardcoded positioning.
    /// </summary>
    public void SetContext(MarketAnalysis marketAnalysis, ServiceAlignment serviceAlignment)
    {
        _marketAnalysis = marketAnalysis;
        _serviceAlignment = serviceAlignment;
    }

    public async Task<dynamic> ExecuteAsync() => await ExecuteAsyncTyped();

    public async Task<GeneratedContent> ExecuteAsyncTyped()
    {
        _logger.LogInformation("Starting Content Generation Agent for {Company}", _company.Name);

        try
        {
            var systemPrompt = BuildSystemPrompt();
            var userPrompt = BuildUserPrompt();

            var messages = new List<ChatMessage>
            {
                new ChatMessage(ChatRole.System, systemPrompt),
                new ChatMessage(ChatRole.User, userPrompt)
            };

            _logger.LogInformation("Sending content generation request for {Company}", _company.Name);

            // Bounded wait: some deployments stall on large structured outputs.
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(120));
            var response = await _chatClient.GetResponseAsync(messages, cancellationToken: cts.Token);
            var contentText = response.Text;

            _logger.LogInformation("Received content response, length: {Length}", contentText.Length);

            var jsonStartIndex = contentText.IndexOf('{');
            var jsonEndIndex = contentText.LastIndexOf('}');

            if (jsonStartIndex < 0 || jsonEndIndex < 0)
            {
                _logger.LogError("No JSON found in content response — using fallback");
                return CreateMockContent();
            }

            var jsonString = contentText.Substring(jsonStartIndex, jsonEndIndex - jsonStartIndex + 1);
            var parsed = JsonSerializer.Deserialize<JsonElement>(jsonString);

            var generatedContent = new GeneratedContent
            {
                GeneratedAt = DateTime.UtcNow,
                QualityScore = 0.85,
                AlignmentToMarket = "strong",
                Metadata = new ContentMetadata
                {
                    MarketFocus = _serviceAlignment?.RecommendedFocus
                        ?? $"General market themes for {string.Join(", ", _company.TargetIndustries)}",
                    FinabeoServicesFeatured = (_serviceAlignment?.FinabeoServices.Select(s => s.ServiceName).ToList())
                        ?? _company.Services.Select(s => s.Name).ToList()
                }
            };

            if (parsed.TryGetProperty("linkedin", out var linkedinElement))
            {
                generatedContent.Content.LinkedIn = new LinkedInContent
                {
                    Post = linkedinElement.TryGetProperty("post", out var post) ? post.GetString() ?? string.Empty : string.Empty,
                    Hashtags = ExtractStringArray(linkedinElement, "hashtags"),
                    EstimatedEngagement = linkedinElement.TryGetProperty("estimated_engagement", out var eng) ? eng.GetString() ?? "medium" : "medium",
                    OptimalPostingTime = linkedinElement.TryGetProperty("optimal_posting_time", out var opt) ? opt.GetString() ?? "Tuesday 9 AM UTC" : "Tuesday 9 AM UTC"
                };
            }

            if (parsed.TryGetProperty("twitter", out var twitterElement))
            {
                var tweets = new List<Tweet>();
                if (twitterElement.TryGetProperty("thread", out var threadElement))
                {
                    foreach (var tweetJson in threadElement.EnumerateArray())
                    {
                        tweets.Add(new Tweet
                        {
                            Text = tweetJson.TryGetProperty("tweet", out var tw) ? tw.GetString() ?? string.Empty : string.Empty,
                            Order = tweetJson.TryGetProperty("order", out var or) && or.ValueKind == JsonValueKind.Number ? or.GetInt32() : 0
                        });
                    }
                }
                generatedContent.Content.Twitter = new TwitterContent
                {
                    Thread = tweets,
                    Hashtags = ExtractStringArray(twitterElement, "hashtags"),
                    MediaDescription = twitterElement.TryGetProperty("media_description", out var md) ? md.GetString() ?? string.Empty : string.Empty
                };
            }

            if (parsed.TryGetProperty("instagram", out var instagramElement))
            {
                generatedContent.Content.Instagram = new InstagramContent
                {
                    Caption = instagramElement.TryGetProperty("caption", out var cap) ? cap.GetString() ?? string.Empty : string.Empty,
                    Hashtags = ExtractStringArray(instagramElement, "hashtags"),
                    EmojisSuggested = ExtractStringArray(instagramElement, "emojis_suggested"),
                    VisualBrief = instagramElement.TryGetProperty("visual_brief", out var vb) ? vb.GetString() ?? string.Empty : string.Empty,
                    ContentType = instagramElement.TryGetProperty("content_type", out var ct) ? ct.GetString() ?? "carousel" : "carousel"
                };
            }

            if (parsed.TryGetProperty("blog", out var blogElement))
            {
                generatedContent.Content.Blog = new BlogContent
                {
                    Title = blogElement.TryGetProperty("title", out var bt) ? bt.GetString() ?? string.Empty : string.Empty,
                    MetaDescription = blogElement.TryGetProperty("meta_description", out var meta) ? meta.GetString() ?? string.Empty : string.Empty,
                    Outline = ExtractStringArray(blogElement, "outline"),
                    DraftContent = blogElement.TryGetProperty("draft_content", out var dc) ? dc.GetString() ?? string.Empty : string.Empty,
                    SeoKeywords = ExtractStringArray(blogElement, "seo_keywords"),
                    WordCount = blogElement.TryGetProperty("word_count", out var wc) && wc.ValueKind == JsonValueKind.Number ? wc.GetInt32() : 1500,
                    CallToAction = blogElement.TryGetProperty("cta", out var cta) ? cta.GetString() ?? string.Empty : string.Empty
                };
            }

            _logger.LogInformation("Content generation completed for {Company}", _company.Name);
            return generatedContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Content Generation Agent for {Company}", _company.Name);
            return CreateMockContent();
        }
    }

    private string BuildSystemPrompt() => $@"You are an expert marketing content strategist writing on behalf of {_company.Name}.

Company: {_company.Name}
What they do: {_company.Description}
Target industries: {string.Join(", ", _company.TargetIndustries)}
Brand voice: {_company.Voice}

Every piece of content must:
1. Speak directly to decision-makers in {_company.Name}'s target industries — NOT fintech, NOT Microsoft Agent Framework, NOT cloud cost. Stay on-topic for {_company.Name}'s actual business.
2. Be grounded in the market insights and service recommendations provided in the user message
3. Match {_company.Name}'s brand voice: {_company.Voice}
4. Include strong, specific calls-to-action relevant to {_company.Name}'s offering
5. Be optimised for each platform (length, tone, hashtag density)

CRITICAL: Return ONLY valid JSON, no other text. Use this exact format:
{{
  ""linkedin"": {{
    ""post"": ""string (150-300 words)"",
    ""hashtags"": [""string""],
    ""estimated_engagement"": ""high|medium|low"",
    ""optimal_posting_time"": ""string""
  }},
  ""twitter"": {{
    ""thread"": [{{""tweet"": ""string"", ""order"": 1}}],
    ""hashtags"": [""string""],
    ""media_description"": ""string""
  }},
  ""instagram"": {{
    ""caption"": ""string"",
    ""hashtags"": [""string""],
    ""emojis_suggested"": [""string""],
    ""visual_brief"": ""string"",
    ""content_type"": ""carousel|single|story""
  }},
  ""blog"": {{
    ""title"": ""string"",
    ""meta_description"": ""string"",
    ""outline"": [""string""],
    ""draft_content"": ""string (1500-2000 words)"",
    ""seo_keywords"": [""string""],
    ""word_count"": 1500,
    ""cta"": ""string""
  }}
}}";

    private string BuildUserPrompt()
    {
        var industries = string.Join(", ", _company.TargetIndustries);

        var marketSummary = _marketAnalysis?.Summary
            ?? $"No upstream market analysis available — write for {industries} based on the company profile alone.";

        var topTrends = _marketAnalysis?.Trends.Take(5).ToList() ?? new List<string>();
        var topPains = _marketAnalysis?.PainPoints.Take(5).ToList() ?? new List<string>();

        var recommendedFocus = _serviceAlignment?.RecommendedFocus
            ?? $"{_company.Services.FirstOrDefault()?.Name ?? _company.Name}'s flagship offering";

        var contentThemes = _serviceAlignment?.ContentThemes.Take(5).ToList() ?? new List<string>();

        var services = (_serviceAlignment?.FinabeoServices.Count > 0
                ? _serviceAlignment.FinabeoServices.Select(s => $"- {s.ServiceName} — {s.WhyFit} (angle: {s.SuggestedAngle})")
                : _company.Services.Select(s => $"- {s.Name} — {s.Description} (differentiator: {s.KeyDifferentiator})"))
            .ToList();

        return $@"Create marketing content for {_company.Name} based on this context:

COMPANY
  Name: {_company.Name}
  What they do: {_company.Description}
  Target industries: {industries}
  Brand voice: {_company.Voice}

MARKET ANALYSIS SUMMARY
{marketSummary}

KEY TRENDS IN {industries.ToUpper()}
{string.Join("\n", topTrends.Select(t => $"- {t}"))}

PAIN POINTS TO ADDRESS
{string.Join("\n", topPains.Select(p => $"- {p}"))}

RECOMMENDED FOCUS THIS WEEK
{recommendedFocus}

SERVICES TO FEATURE
{string.Join("\n", services)}

CONTENT THEMES
{string.Join("\n", contentThemes.Select(t => $"- {t}"))}

Write content that would be appropriate for {_company.Name} to publish this week. Every post should sound like it came from {_company.Name}, speak to the audience in {industries}, and reference the services and pain points above. Do NOT mention fintech, Microsoft Agent Framework, or cloud cost optimisation unless those are genuinely part of {_company.Name}'s offering.";
    }

    private static List<string> ExtractStringArray(JsonElement element, string propertyName)
    {
        var result = new List<string>();
        if (element.TryGetProperty(propertyName, out var arrayElement) && arrayElement.ValueKind == JsonValueKind.Array)
        {
            result = arrayElement.EnumerateArray()
                .Select(e => e.GetString() ?? string.Empty)
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
        }
        return result;
    }

    private GeneratedContent CreateMockContent()
    {
        var industries = string.Join(", ", _company.TargetIndustries);
        var service = _company.Services.FirstOrDefault();
        var serviceName = service?.Name ?? _company.Name;
        var differentiator = service?.KeyDifferentiator ?? _company.Description;

        return new GeneratedContent
        {
            GeneratedAt = DateTime.UtcNow,
            QualityScore = 0.60,
            AlignmentToMarket = "fallback",
            Metadata = new ContentMetadata
            {
                MarketFocus = $"Fallback content for {_company.Name} — the LLM response could not be parsed",
                FinabeoServicesFeatured = _company.Services.Select(s => s.Name).ToList()
            },
            Content = new ContentByPlatform
            {
                LinkedIn = new LinkedInContent
                {
                    Post = $"[{_company.Name} — fallback post] {_company.Description}\n\nFocus this week: {serviceName}. {differentiator}",
                    Hashtags = new List<string> { $"#{_company.Name.Replace(" ", "")}" },
                    EstimatedEngagement = "medium",
                    OptimalPostingTime = "Tuesday 9 AM UTC"
                },
                Twitter = new TwitterContent
                {
                    Thread = new List<Tweet>
                    {
                        new() { Text = $"[{_company.Name} fallback] {_company.Description}", Order = 1 }
                    },
                    Hashtags = new List<string> { $"#{_company.Name.Replace(" ", "")}" },
                    MediaDescription = $"Generic brand image for {_company.Name}"
                },
                Instagram = new InstagramContent
                {
                    Caption = $"[{_company.Name} fallback] {_company.Description}",
                    Hashtags = new List<string> { $"#{_company.Name.Replace(" ", "")}" },
                    EmojisSuggested = new List<string> { "🔧", "✅" },
                    VisualBrief = $"Image representing {_company.Name}'s work in {industries}",
                    ContentType = "single"
                },
                Blog = new BlogContent
                {
                    Title = $"{_company.Name}: focus on {serviceName}",
                    MetaDescription = $"Fallback blog post for {_company.Name}",
                    Outline = new List<string> { "Intro", "The problem", serviceName, "Call to action" },
                    DraftContent = $"# {_company.Name}: focus on {serviceName}\n\n(Fallback content — re-run the workflow to get real output.)\n\n{_company.Description}",
                    SeoKeywords = new List<string> { _company.Name, serviceName },
                    WordCount = 120,
                    CallToAction = $"Contact {_company.Name} to learn more."
                }
            }
        };
    }
}
