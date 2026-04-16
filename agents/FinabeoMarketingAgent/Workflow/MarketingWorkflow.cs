using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FinabeoMarketingAgent.Workflow;

/// <summary>
/// Orchestrates the multi-agent workflow for marketing content generation
/// </summary>
public class MarketingWorkflow
{
    private readonly MarketResearchAgent _researchAgent;
    private readonly ServiceAlignmentAgent _alignmentAgent;
    private readonly ContentGenerationAgent _contentAgent;
    private readonly ILogger<MarketingWorkflow> _logger;

    public MarketingWorkflow(
        MarketResearchAgent researchAgent,
        ServiceAlignmentAgent alignmentAgent,
        ContentGenerationAgent contentAgent,
        ILogger<MarketingWorkflow> logger)
    {
        _researchAgent = researchAgent;
        _alignmentAgent = alignmentAgent;
        _contentAgent = contentAgent;
        _logger = logger;
    }

    /// <summary>
    /// Execute the complete marketing workflow
    /// </summary>
    public async Task<WorkflowResult> ExecuteAsync()
    {
        _logger.LogInformation("Starting Marketing Workflow");

        var result = new WorkflowResult
        {
            StartedAt = DateTime.UtcNow
        };

        try
        {
            // Step 1: Market Research
            _logger.LogInformation("Step 1/3: Executing Market Research Agent");
            result.MarketAnalysis = await _researchAgent.ExecuteAsyncTyped();
            _logger.LogInformation($"✓ Market Research completed: {result.MarketAnalysis.MarketInsights.Count} insights");

            // Step 2: Service Alignment
            _logger.LogInformation("Step 2/3: Executing Service Alignment Agent");
            result.ServiceAlignment = await _alignmentAgent.ExecuteAsyncTyped();
            result.ServiceAlignment.MarketAnalysis = result.MarketAnalysis;
            _logger.LogInformation($"✓ Service Alignment completed: {result.ServiceAlignment.FinabeoServices.Count} recommendations");

            // Step 3: Content Generation — feed upstream context so prompts can reference
            // the actual market insights and service recommendations for this company.
            _logger.LogInformation("Step 3/3: Executing Content Generation Agent");
            _contentAgent.SetContext(result.MarketAnalysis, result.ServiceAlignment);
            result.GeneratedContent = await _contentAgent.ExecuteAsyncTyped();
            _logger.LogInformation("✓ Content Generation completed");

            result.CompletedAt = DateTime.UtcNow;
            result.Status = WorkflowStatus.Completed;

            _logger.LogInformation($"Workflow completed successfully in {result.Duration.TotalSeconds:F2} seconds");

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Workflow failed: {ex.Message}");
            result.Status = WorkflowStatus.Failed;
            result.Error = ex.Message;
            result.CompletedAt = DateTime.UtcNow;
            return result;
        }
    }
}

/// <summary>
/// Workflow execution result
/// </summary>
public class WorkflowResult
{
    [JsonPropertyName("status")]
    public WorkflowStatus Status { get; set; } = WorkflowStatus.Running;

    [JsonPropertyName("started_at")]
    public DateTime StartedAt { get; set; }

    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [JsonPropertyName("duration_seconds")]
    public double DurationSeconds => ((CompletedAt ?? DateTime.UtcNow) - StartedAt).TotalSeconds;

    [JsonPropertyName("market_analysis")]
    public MarketAnalysis? MarketAnalysis { get; set; }

    [JsonPropertyName("service_alignment")]
    public ServiceAlignment? ServiceAlignment { get; set; }

    [JsonPropertyName("generated_content")]
    public GeneratedContent? GeneratedContent { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonIgnore]
    public TimeSpan Duration => (CompletedAt ?? DateTime.UtcNow) - StartedAt;
}

/// <summary>
/// Workflow execution status
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum WorkflowStatus
{
    Running,
    Completed,
    Failed
}
