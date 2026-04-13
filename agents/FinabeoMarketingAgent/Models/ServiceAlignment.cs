using System.Text.Json.Serialization;

namespace FinabeoMarketingAgent.Models;

/// <summary>
/// Alignment analysis between market needs and Finabeo services
/// </summary>
public class ServiceAlignment
{
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("market_analysis")]
    public MarketAnalysis? MarketAnalysis { get; set; }

    [JsonPropertyName("finabeo_services")]
    public List<ServiceRecommendation> FinabeoServices { get; set; } = new();

    [JsonPropertyName("recommended_focus")]
    public string RecommendedFocus { get; set; } = string.Empty;

    [JsonPropertyName("content_themes")]
    public List<string> ContentThemes { get; set; } = new();

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;
}

/// <summary>
/// Service recommendation with alignment score
/// </summary>
public class ServiceRecommendation
{
    [JsonPropertyName("service_name")]
    public string ServiceName { get; set; } = string.Empty;

    [JsonPropertyName("target_market")]
    public string TargetMarket { get; set; } = string.Empty;

    [JsonPropertyName("alignment_score")]
    public double AlignmentScore { get; set; } // 0.0 to 1.0

    [JsonPropertyName("why_fit")]
    public string WhyFit { get; set; } = string.Empty;

    [JsonPropertyName("key_benefits_to_highlight")]
    public List<string> KeyBenefits { get; set; } = new();

    [JsonPropertyName("suggested_angle")]
    public string SuggestedAngle { get; set; } = string.Empty;
}
