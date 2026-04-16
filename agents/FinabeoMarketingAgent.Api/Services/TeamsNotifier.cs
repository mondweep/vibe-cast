using System.Text;
using System.Text.Json;

namespace FinabeoMarketingAgent.Api.Services;

/// <summary>
/// Posts notifications to a Microsoft Teams channel via Incoming Webhook.
///
/// Sends an Adaptive Card with a run summary and a clickable link to the
/// approval page. Since Incoming Webhooks are one-way (can post but can't
/// receive button callbacks), the actual approve/reject happens via the
/// web-based approval page served by the API.
/// </summary>
public class TeamsNotifier
{
    private readonly HttpClient _httpClient;
    private readonly string? _webhookUrl;
    private readonly string _baseUrl;
    private readonly ILogger<TeamsNotifier> _logger;

    public TeamsNotifier(IConfiguration config, ILoggerFactory loggerFactory)
    {
        _httpClient = new HttpClient();
        _webhookUrl = config["Teams:WebhookUrl"];
        _baseUrl = config["App:BaseUrl"] ?? "http://localhost:8080";
        _logger = loggerFactory.CreateLogger<TeamsNotifier>();
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_webhookUrl);

    public async Task NotifyPendingApprovalAsync(
        string runId, string companyName, string recommendedFocus,
        double durationSeconds, int llmCalls, long totalTokens)
    {
        if (!IsConfigured)
        {
            _logger.LogInformation("[Teams] No webhook URL configured — skipping notification for run {RunId}", runId);
            return;
        }

        var approvalUrl = $"{_baseUrl}/approve.html?runId={runId}";

        // Adaptive Card payload for Teams Incoming Webhook
        // Uses the MessageCard format which Incoming Webhooks support
        var card = new
        {
            type = "message",
            attachments = new[]
            {
                new
                {
                    contentType = "application/vnd.microsoft.card.adaptive",
                    contentUrl = (string?)null,
                    content = new
                    {
                        type = "AdaptiveCard",
                        version = "1.4",
                        body = new object[]
                        {
                            new
                            {
                                type = "TextBlock",
                                size = "Medium",
                                weight = "Bolder",
                                text = $"🔔 Marketing content ready for review"
                            },
                            new
                            {
                                type = "FactSet",
                                facts = new[]
                                {
                                    new { title = "Company", value = companyName },
                                    new { title = "Run ID", value = runId },
                                    new { title = "Focus", value = recommendedFocus },
                                    new { title = "Duration", value = $"{durationSeconds:F0}s" },
                                    new { title = "LLM Calls", value = llmCalls.ToString() },
                                    new { title = "Tokens", value = totalTokens.ToString("N0") }
                                }
                            },
                            new
                            {
                                type = "TextBlock",
                                text = "Content has been generated and is waiting for your approval before being published to blob storage.",
                                wrap = true
                            }
                        },
                        actions = new[]
                        {
                            new
                            {
                                type = "Action.OpenUrl",
                                title = "Review & Approve",
                                url = approvalUrl
                            }
                        }
                    }
                }
            }
        };

        try
        {
            var json = JsonSerializer.Serialize(card);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("[Teams] Posting approval notification for run {RunId} to Teams", runId);
            var response = await _httpClient.PostAsync(_webhookUrl, content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Teams] ✓ Notification sent for run {RunId}", runId);
            }
            else
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[Teams] Notification failed ({Status}): {Body}",
                    response.StatusCode, body.Substring(0, Math.Min(200, body.Length)));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Teams] Failed to send notification for run {RunId}", runId);
        }
    }
}
