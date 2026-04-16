using System.Text.Json.Serialization;

namespace FinabeoMarketingAgent.Models;

/// <summary>
/// Market analysis output from the Research Agent
/// </summary>
public class MarketAnalysis
{
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("market_insights")]
    public List<MarketInsight> MarketInsights { get; set; } = new();

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("trends")]
    public List<string> Trends { get; set; } = new();

    [JsonPropertyName("pain_points")]
    public List<string> PainPoints { get; set; } = new();
}

/// <summary>
/// Individual market insight
/// </summary>
public class MarketInsight
{
    [JsonPropertyName("trend")]
    public string Trend { get; set; } = string.Empty;

    [JsonPropertyName("pain_point")]
    public string PainPoint { get; set; } = string.Empty;

    [JsonPropertyName("market_segment")]
    public string MarketSegment { get; set; } = string.Empty;

    [JsonPropertyName("relevance_to_company")]
    public string Relevance { get; set; } = "medium"; // high, medium, low

    [JsonPropertyName("opportunity_description")]
    public string OpportunityDescription { get; set; } = string.Empty;
}
