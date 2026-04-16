using System.ComponentModel;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Tools;

/// <summary>
/// Web search tools exposed as <see cref="AIFunction"/> instances so the Research
/// Agent can ground its market insights in real, current data rather than relying
/// on LLM-synthesised trends from training data.
///
/// Uses the Brave Search API (free tier, 2000 queries/month). Set the environment
/// variable <c>BRAVE_SEARCH_API_KEY</c> or config key <c>BraveSearch:ApiKey</c>.
///
/// When no API key is configured, the tools fall back to returning a clearly-marked
/// "no live search available" message so the workflow still completes — the Research
/// Agent then synthesises from training data as before, but the output is honestly
/// labelled.
///
/// Framework exploration: this tests whether giving the Research Agent tools works
/// as cleanly as it does for the Alignment Agent, and whether the LLM makes good
/// decisions about when/what to search.
/// </summary>
public class WebSearchTools
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;
    private readonly ILogger _logger;

    private const string BraveSearchEndpoint = "https://api.search.brave.com/res/v1/web/search";
    private const int MaxResultsPerQuery = 5;

    public WebSearchTools(string? apiKey, ILoggerFactory loggerFactory)
    {
        _apiKey = apiKey;
        _logger = loggerFactory.CreateLogger<WebSearchTools>();
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    /// <summary>
    /// Build the AIFunction array to attach to ChatOptions.Tools for the Research Agent.
    /// </summary>
    public IList<AITool> AsAIFunctions() =>
    [
        AIFunctionFactory.Create(SearchWeb),
        AIFunctionFactory.Create(SearchNews)
    ];

    [Description("Search the web for current information on a topic. Returns the top 5 results with titles, URLs, and snippets. Use this to ground market research in real, current data rather than relying on training knowledge. Call this 2-3 times with different targeted queries to build a well-rounded picture.")]
    public async Task<string> SearchWeb(
        [Description("The search query — be specific and targeted, e.g. 'UK fleet safety regulations 2026' rather than 'fleet safety'.")]
        string query)
    {
        return await ExecuteSearchAsync(query, freshness: null);
    }

    [Description("Search for recent news articles on a topic. Returns the top 5 results limited to the past month. Use this to find current trends, recent incidents, or breaking developments in a market.")]
    public async Task<string> SearchNews(
        [Description("The news search query — focus on recent events, regulations, or market developments.")]
        string query)
    {
        // Brave's freshness parameter: pd = past day, pw = past week, pm = past month
        return await ExecuteSearchAsync(query, freshness: "pm");
    }

    private async Task<string> ExecuteSearchAsync(string query, string? freshness)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("[WebSearch] No API key configured — returning fallback for query: {Query}", query);
            return JsonSerializer.Serialize(new
            {
                status = "no_api_key",
                query,
                message = "Web search is not configured (no BRAVE_SEARCH_API_KEY). The Research Agent should synthesise insights from training knowledge and clearly note that results are NOT grounded in live web data.",
                results = Array.Empty<object>()
            });
        }

        try
        {
            var url = $"{BraveSearchEndpoint}?q={Uri.EscapeDataString(query)}&count={MaxResultsPerQuery}";
            if (!string.IsNullOrEmpty(freshness))
                url += $"&freshness={freshness}";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("X-Subscription-Token", _apiKey);

            _logger.LogInformation("[WebSearch] Searching: {Query}", query);
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[WebSearch] Brave API returned {Status}: {Body}",
                    response.StatusCode, errorBody.Substring(0, Math.Min(200, errorBody.Length)));

                return JsonSerializer.Serialize(new
                {
                    status = "error",
                    query,
                    httpStatus = (int)response.StatusCode,
                    message = $"Search API returned {response.StatusCode}. The agent should proceed with training knowledge.",
                    results = Array.Empty<object>()
                });
            }

            var json = await response.Content.ReadAsStringAsync();
            var parsed = JsonSerializer.Deserialize<JsonElement>(json);

            var results = new List<object>();
            if (parsed.TryGetProperty("web", out var web) &&
                web.TryGetProperty("results", out var webResults))
            {
                foreach (var r in webResults.EnumerateArray().Take(MaxResultsPerQuery))
                {
                    results.Add(new
                    {
                        title = r.TryGetProperty("title", out var t) ? t.GetString() : "",
                        url = r.TryGetProperty("url", out var u) ? u.GetString() : "",
                        description = r.TryGetProperty("description", out var d) ? d.GetString() : "",
                        age = r.TryGetProperty("age", out var a) ? a.GetString() : ""
                    });
                }
            }

            _logger.LogInformation("[WebSearch] Got {Count} results for: {Query}", results.Count, query);

            return JsonSerializer.Serialize(new
            {
                status = "ok",
                query,
                resultCount = results.Count,
                results
            }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WebSearch] Failed for query: {Query}", query);
            return JsonSerializer.Serialize(new
            {
                status = "error",
                query,
                message = $"Search failed: {ex.Message}. The agent should proceed with training knowledge.",
                results = Array.Empty<object>()
            });
        }
    }
}
