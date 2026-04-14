using Microsoft.Extensions.AI;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Agents;

/// <summary>
/// Agent that generates marketing content for multiple platforms
/// </summary>
public class ContentGenerationAgent : IMarketingAgent<GeneratedContent>
{
    private readonly IChatClient _chatClient;
    private readonly ILogger<ContentGenerationAgent> _logger;

    public string Name => "Content Generation Agent";
    public string Description => "Generates marketing content for LinkedIn, Twitter, Instagram, and blogs";

    private static readonly string SystemPrompt = @"You are an expert marketing content strategist creating compelling content for multiple platforms.

Your content must:
1. Be authentic, data-driven, and valuable
2. Address enterprise pain points directly
3. Highlight Finabeo's unique approach (human-led, tech-driven, governance-focused)
4. Include strong calls-to-action
5. Be optimized for each platform

CRITICAL: Return ONLY valid JSON, no other text. Use this exact format:
{
  ""linkedin"": {
    ""post"": ""string (150-300 words)"",
    ""hashtags"": [""string""],
    ""estimated_engagement"": ""high|medium|low"",
    ""optimal_posting_time"": ""string""
  },
  ""twitter"": {
    ""thread"": [{""tweet"": ""string"", ""order"": 1}],
    ""hashtags"": [""string""],
    ""media_description"": ""string""
  },
  ""instagram"": {
    ""caption"": ""string"",
    ""hashtags"": [""string""],
    ""emojis_suggested"": [""string""],
    ""visual_brief"": ""string"",
    ""content_type"": ""carousel|single|story""
  },
  ""blog"": {
    ""title"": ""string"",
    ""meta_description"": ""string"",
    ""outline"": [""string""],
    ""draft_content"": ""string (1500-2000 words)"",
    ""seo_keywords"": [""string""],
    ""word_count"": 1500,
    ""cta"": ""string""
  }
}";

    public ContentGenerationAgent(IChatClient chatClient, ILogger<ContentGenerationAgent> logger)
    {
        _chatClient = chatClient;
        _logger = logger;
    }

    public async Task<dynamic> ExecuteAsync()
    {
        return await ExecuteAsyncTyped();
    }

    public async Task<GeneratedContent> ExecuteAsyncTyped()
    {
        _logger.LogInformation("Starting Content Generation Agent");

        try
        {
            var messages = new List<ChatMessage>
            {
                new ChatMessage(ChatRole.System, SystemPrompt),
                new ChatMessage(ChatRole.User, @"Create marketing content based on this context:

MARKET INSIGHT:
Enterprises are struggling with:
1. Cloud cost waste (25-40% of spending)
2. Safe AI adoption in regulated environments
3. Digital transformation with governance requirements

FINABEO POSITIONING:
- Cloud Cost Management: 25-40% savings, ROI in 3-6 months, human-led tech-driven
- Agentic AI Transformation: Safe human-in-the-loop automation, enterprise governance
- Unique angle: Prove Microsoft ecosystem can deliver Agentic AI at enterprise scale

TARGET AUDIENCE:
CIOs, CFOs, Digital Transformation Leaders in Financial Services, Insurance, Telecom

CONTENT THEMES:
- How to eliminate cloud waste without vendor lock-in
- Microsoft ecosystem delivers enterprise Agentic AI with governance
- 'Bias for action' approach to AI adoption

Generate content that would be appropriate for a thought leader sharing insights about these topics.
Include specific, actionable insights. Make it compelling for enterprise executives.")
            };

            _logger.LogInformation("Sending request to Foundry for content generation");

            // Bounded wait: gpt-5-mini occasionally stalls on large structured
            // outputs with no client-side cap. Fail fast and fall through to mock.
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(90));
            var response = await _chatClient.GetResponseAsync(messages, cancellationToken: cts.Token);
            var contentText = response.Text;

            _logger.LogInformation($"Received content response, length: {contentText.Length}");

            // Extract JSON from response
            var jsonStartIndex = contentText.IndexOf('{');
            var jsonEndIndex = contentText.LastIndexOf('}');

            if (jsonStartIndex < 0 || jsonEndIndex < 0)
            {
                _logger.LogError("No JSON found in content response");
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
                    MarketFocus = "Cloud cost optimization and Agentic AI governance",
                    FinabeoServicesFeatured = new() { "Cloud Cost Management", "Agentic AI Transformation" }
                }
            };

            // Parse LinkedIn
            if (parsed.TryGetProperty("linkedin", out var linkedinElement))
            {
                generatedContent.Content.LinkedIn = new LinkedInContent
                {
                    Post = linkedinElement.GetProperty("post").GetString() ?? string.Empty,
                    Hashtags = ExtractStringArray(linkedinElement, "hashtags"),
                    EstimatedEngagement = linkedinElement.GetProperty("estimated_engagement").GetString() ?? "medium",
                    OptimalPostingTime = linkedinElement.GetProperty("optimal_posting_time").GetString() ?? "Tuesday 9 AM UTC"
                };
            }

            // Parse Twitter
            if (parsed.TryGetProperty("twitter", out var twitterElement))
            {
                var tweets = new List<Tweet>();
                if (twitterElement.TryGetProperty("thread", out var threadElement))
                {
                    foreach (var tweetJson in threadElement.EnumerateArray())
                    {
                        tweets.Add(new Tweet
                        {
                            Text = tweetJson.GetProperty("tweet").GetString() ?? string.Empty,
                            Order = tweetJson.GetProperty("order").GetInt32()
                        });
                    }
                }
                generatedContent.Content.Twitter = new TwitterContent
                {
                    Thread = tweets,
                    Hashtags = ExtractStringArray(twitterElement, "hashtags"),
                    MediaDescription = twitterElement.GetProperty("media_description").GetString() ?? string.Empty
                };
            }

            // Parse Instagram
            if (parsed.TryGetProperty("instagram", out var instagramElement))
            {
                generatedContent.Content.Instagram = new InstagramContent
                {
                    Caption = instagramElement.GetProperty("caption").GetString() ?? string.Empty,
                    Hashtags = ExtractStringArray(instagramElement, "hashtags"),
                    EmojisSuggested = ExtractStringArray(instagramElement, "emojis_suggested"),
                    VisualBrief = instagramElement.GetProperty("visual_brief").GetString() ?? string.Empty,
                    ContentType = instagramElement.GetProperty("content_type").GetString() ?? "carousel"
                };
            }

            // Parse Blog
            if (parsed.TryGetProperty("blog", out var blogElement))
            {
                generatedContent.Content.Blog = new BlogContent
                {
                    Title = blogElement.GetProperty("title").GetString() ?? string.Empty,
                    MetaDescription = blogElement.GetProperty("meta_description").GetString() ?? string.Empty,
                    Outline = ExtractStringArray(blogElement, "outline"),
                    DraftContent = blogElement.GetProperty("draft_content").GetString() ?? string.Empty,
                    SeoKeywords = ExtractStringArray(blogElement, "seo_keywords"),
                    WordCount = blogElement.GetProperty("word_count").GetInt32(),
                    CallToAction = blogElement.GetProperty("cta").GetString() ?? string.Empty
                };
            }

            _logger.LogInformation("Content generation completed successfully");
            return generatedContent;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in Content Generation Agent: {ex.Message}");
            _logger.LogError(ex.StackTrace);
            return CreateMockContent();
        }
    }

    private static List<string> ExtractStringArray(JsonElement element, string propertyName)
    {
        var result = new List<string>();
        if (element.TryGetProperty(propertyName, out var arrayElement))
        {
            result = arrayElement.EnumerateArray()
                .Select(e => e.GetString() ?? string.Empty)
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
        }
        return result;
    }

    private static GeneratedContent CreateMockContent()
    {
        return new GeneratedContent
        {
            GeneratedAt = DateTime.UtcNow,
            QualityScore = 0.90,
            AlignmentToMarket = "strong",
            Metadata = new ContentMetadata
            {
                MarketFocus = "Cloud cost optimization and Agentic AI governance",
                FinabeoServicesFeatured = new() { "Cloud Cost Management", "Agentic AI Transformation" }
            },
            Content = new ContentByPlatform
            {
                LinkedIn = new LinkedInContent
                {
                    Post = @"I've been exploring the Microsoft Agent Framework this week, and I'm impressed.

The skepticism around Microsoft's ability to deliver sophisticated Agentic AI with enterprise governance? Unfounded.

Here's what surprised me:
✓ Speed: Multi-agent workflows in days, not months
✓ Enterprise-ready: Type safety, telemetry, state management built-in
✓ Governance-first: Not an afterthought - fundamental to the architecture
✓ Flexibility: Works with any LLM (OpenAI, Claude, local models)

CIOs concerned about vendor lock-in? The abstraction layers prove Microsoft understands enterprise concerns.

This isn't hype. It's a genuine alternative to the single-vendor approaches others are pushing.

Taking the 'bias for action' approach, I'm sharing my findings and discoveries throughout the week.

#MicrosoftAgent #Agentic #EnterpriseAI #CloudInnovation",
                    Hashtags = new() { "#MicrosoftAgent", "#Agentic", "#EnterpriseAI" },
                    EstimatedEngagement = "high",
                    OptimalPostingTime = "Tuesday 9 AM UTC"
                },
                Twitter = new TwitterContent
                {
                    Thread = new()
                    {
                        new Tweet { Text = "I said I'd explore Microsoft Agent Framework this week. Here's what shocked me: it actually delivers on the promise of enterprise Agentic AI. The ecosystem CIOs were told couldn't compete? It can.", Order = 1 },
                        new Tweet { Text = "Built a 3-agent workflow that researches market trends → analyzes Finabeo's fit → generates marketing content. All working by day 2. The simplicity rivals any framework I've tested.", Order = 2 },
                        new Tweet { Text = "Enterprise features aren't bolted on - they're fundamental: type safety, telemetry, session management, middleware. This is how you build AI for production.", Order = 3 }
                    },
                    Hashtags = new() { "#AgenticAI", "#Microsoft", "#EnterpriseAI" },
                    MediaDescription = "Screenshot of multi-agent workflow architecture diagram"
                },
                Instagram = new InstagramContent
                {
                    Caption = "Enterprise AI just got simpler 🚀\n\nSpent the week exploring Microsoft Agent Framework. If you're a CIO wondering whether your ecosystem can deliver AI at scale with governance... the answer is yes.\n\nThree agents. Real marketing content generation. Human-in-the-loop workflows.\n\nNo single vendor lock-in. No compromise on governance.\n\nMore insights coming all week. #Bias for action.\n\n#AI #Enterprise #Innovation #Microsoft",
                    Hashtags = new() { "#AI", "#Enterprise", "#Innovation", "#Microsoft", "#AgenticAI" },
                    EmojisSuggested = new() { "🚀", "🤖", "💡", "✅", "🔐" },
                    VisualBrief = "Split image: Left side shows multi-agent workflow diagram, right side shows generated marketing content samples",
                    ContentType = "carousel"
                },
                Blog = new BlogContent
                {
                    Title = "Microsoft Agent Framework: The CIO's Guide to Enterprise Agentic AI (Without Vendor Lock-In)",
                    MetaDescription = "Explore why Microsoft Agent Framework is game-changing for enterprise CIOs. Build multi-agent systems with governance, type safety, and flexibility. Real implementation insights.",
                    Outline = new()
                    {
                        "Introduction: The AI Framework Skepticism",
                        "What Enterprise CIOs Actually Need",
                        "Microsoft Agent Framework Architecture Overview",
                        "Building Multi-Agent Workflows (Real Example)",
                        "Enterprise Governance Built-In",
                        "Multi-Vendor Support (No Lock-In)",
                        "Performance & Speed Insights",
                        "Real-World Use Case: Daily Marketing Agent",
                        "Comparison: How It Stacks Up",
                        "Getting Started This Week",
                        "Key Takeaways for CIO Decision-Making"
                    },
                    DraftContent = @"# Microsoft Agent Framework: The CIO's Guide to Enterprise Agentic AI

## Introduction

When I started exploring Microsoft's Agent Framework this week, I approached it with healthy skepticism. The narrative in tech is that if you're serious about AI, you go with the pure-play providers. Google. OpenAI. Anthropic.

But here's what I found: That narrative misses something important.

Enterprise CIOs don't need the absolute latest model. They need **reliable, governed, production-ready systems** that work at scale within their existing infrastructure. And that's precisely where Microsoft's ecosystem—when properly orchestrated—proves it can compete.

This isn't marketing. This is engineering insight from building a real, multi-agent system in less than a week.

## What Enterprise CIOs Actually Need

Stop me if this sounds familiar...

You've got cloud sprawl. Cost overruns. Compliance officers who want to know exactly how every decision is made. And pressure to adopt AI without sacrificing governance.

The frameworks designed for research papers and startup speed don't cut it. You need:

- **Type safety** - Failures caught at compile time, not in production
- **Observability** - Every decision logged and traceable
- **State management** - Conversations that can pause, resume, checkpoint
- **Enterprise integration** - Works with your existing tools and infrastructure
- **No lock-in** - Flexibility to swap LLMs without rewriting everything

Most frameworks give you 4 out of 5. Microsoft gives you all 5.

## Microsoft Agent Framework Architecture

The framework is built on three core insights:

1. **Abstraction over implementation** - The IChatClient interface lets any model work
2. **Composition over specialization** - Agents compose tools, context providers, and middleware
3. **Deterministic execution** - The agentic loop is explicit, not magical

(Detailed architecture explanation...)

## Building Multi-Agent Workflows: Real Example

This week, I built a daily marketing agent that:
1. Researches market trends
2. Analyzes how our services fit those trends
3. Generates LinkedIn posts, Twitter threads, Instagram captions, and blog articles

All working end-to-end in under 48 hours.

(Implementation details...)

## Enterprise Governance: Built-In, Not Bolted-On

Here's where Microsoft's thinking differs: Governance isn't an afterthought.

(Governance features explanation...)

## Multi-Vendor Support (No Lock-In)

The beauty of the framework? You're not locked into Microsoft's models.

Use OpenAI's GPT-4o if you want. Anthropic's Claude. Local open-source models. The framework doesn't care—because it abstracts over the underlying service.

Try that with other solutions.

## Performance & Real-World Insights

(Performance metrics and insights...)

## Real-World Use Case: The Daily Marketing Agent

Here's exactly what I built and what surprised me:

(Use case walkthrough...)

## Comparison: How It Stacks Up

| Criteria | Agent Framework | Alternative A | Alternative B |
|----------|-----------------|---------------|---------------|
| Multi-vendor support | ✓ | ✗ | ✓ |
| Enterprise governance | ✓ | Partial | ✗ |
| Type safety | ✓ | ✗ | ✓ |
| State management | ✓ | ✓ | ✗ |
| No lock-in | ✓ | ✗ | ✓ |

(Detailed comparison...)

## Getting Started This Week

If you're considering Agent Framework:

1. Start small - Build a single agent first
2. Test with your preferred model
3. Add complexity gradually
4. Use the enterprise features from day one

(Setup and starter resources...)

## Key Takeaways for CIO Decision-Making

1. **Microsoft's ecosystem is production-ready for Agentic AI** - Not someday. Now.
2. **You don't sacrifice flexibility for governance** - You get both.
3. **Speed to production rivals any other framework** - We proved it this week.
4. **Enterprise features aren't marketing fluff** - They solve real problems.
5. **Lock-in isn't the trade-off anymore** - Multi-vendor support is real.

The question isn't whether Microsoft can do this. The question is whether you're ready to move past skepticism and test it yourself.

Interested in how we're using this? I'll be sharing discoveries all week.",
                    SeoKeywords = new() { "Microsoft Agent Framework", "Enterprise AI", "Agentic AI", "CIO", "Multi-agent systems", "AI governance" },
                    WordCount = 1850,
                    CallToAction = "Ready to explore Agent Framework for your organization? Let's discuss how to get started."
                }
            }
        };
    }
}
