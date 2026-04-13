using System.Text.Json.Serialization;

namespace FinabeoMarketingAgent.Models;

/// <summary>
/// Complete generated marketing content for all platforms
/// </summary>
public class GeneratedContent
{
    [JsonPropertyName("generated_at")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("content")]
    public ContentByPlatform Content { get; set; } = new();

    [JsonPropertyName("metadata")]
    public ContentMetadata Metadata { get; set; } = new();

    [JsonPropertyName("quality_score")]
    public double QualityScore { get; set; }

    [JsonPropertyName("alignment_to_market")]
    public string AlignmentToMarket { get; set; } = "strong";
}

/// <summary>
/// Content organized by platform
/// </summary>
public class ContentByPlatform
{
    [JsonPropertyName("linkedin")]
    public LinkedInContent LinkedIn { get; set; } = new();

    [JsonPropertyName("twitter")]
    public TwitterContent Twitter { get; set; } = new();

    [JsonPropertyName("instagram")]
    public InstagramContent Instagram { get; set; } = new();

    [JsonPropertyName("blog")]
    public BlogContent Blog { get; set; } = new();
}

/// <summary>
/// LinkedIn post content
/// </summary>
public class LinkedInContent
{
    [JsonPropertyName("post")]
    public string Post { get; set; } = string.Empty;

    [JsonPropertyName("hashtags")]
    public List<string> Hashtags { get; set; } = new();

    [JsonPropertyName("estimated_engagement")]
    public string EstimatedEngagement { get; set; } = "medium"; // high, medium, low

    [JsonPropertyName("optimal_posting_time")]
    public string OptimalPostingTime { get; set; } = "Tuesday 9 AM UTC";
}

/// <summary>
/// Twitter/X thread content
/// </summary>
public class TwitterContent
{
    [JsonPropertyName("thread")]
    public List<Tweet> Thread { get; set; } = new();

    [JsonPropertyName("hashtags")]
    public List<string> Hashtags { get; set; } = new();

    [JsonPropertyName("media_description")]
    public string MediaDescription { get; set; } = string.Empty;
}

/// <summary>
/// Individual tweet in a thread
/// </summary>
public class Tweet
{
    [JsonPropertyName("tweet")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("order")]
    public int Order { get; set; }
}

/// <summary>
/// Instagram caption content
/// </summary>
public class InstagramContent
{
    [JsonPropertyName("caption")]
    public string Caption { get; set; } = string.Empty;

    [JsonPropertyName("hashtags")]
    public List<string> Hashtags { get; set; } = new();

    [JsonPropertyName("emojis_suggested")]
    public List<string> EmojisSuggested { get; set; } = new();

    [JsonPropertyName("visual_brief")]
    public string VisualBrief { get; set; } = string.Empty;

    [JsonPropertyName("content_type")]
    public string ContentType { get; set; } = "carousel"; // carousel, single, story
}

/// <summary>
/// Blog article content
/// </summary>
public class BlogContent
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("meta_description")]
    public string MetaDescription { get; set; } = string.Empty;

    [JsonPropertyName("outline")]
    public List<string> Outline { get; set; } = new();

    [JsonPropertyName("draft_content")]
    public string DraftContent { get; set; } = string.Empty;

    [JsonPropertyName("seo_keywords")]
    public List<string> SeoKeywords { get; set; } = new();

    [JsonPropertyName("word_count")]
    public int WordCount { get; set; }

    [JsonPropertyName("cta")]
    public string CallToAction { get; set; } = string.Empty;
}

/// <summary>
/// Metadata about the generated content
/// </summary>
public class ContentMetadata
{
    [JsonPropertyName("market_focus")]
    public string MarketFocus { get; set; } = string.Empty;

    [JsonPropertyName("finabeo_services_featured")]
    public List<string> FinabeoServicesFeatured { get; set; } = new();

    [JsonPropertyName("review_notes")]
    public string ReviewNotes { get; set; } = string.Empty;
}
