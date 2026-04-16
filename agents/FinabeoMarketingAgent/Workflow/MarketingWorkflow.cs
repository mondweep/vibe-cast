using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FinabeoMarketingAgent.Workflow;

/// <summary>
/// Orchestrates the multi-agent marketing workflow with a quality gate.
///
/// Pipeline:  Research → [Alignment → Quality Gate (loop if score &lt; threshold)] → Content
///
/// The quality gate is the framework-exploration piece: it tests whether the
/// workflow can do more than linear Step1 → Step2 → Step3. The answer is that
/// the framework provides agents and middleware, but workflow orchestration
/// (branching, looping, conditional re-execution) is bring-your-own — you
/// write it in plain C# control flow. This is honest and pragmatic, not a gap.
/// </summary>
public class MarketingWorkflow
{
    private readonly MarketResearchAgent _researchAgent;
    private readonly ServiceAlignmentAgent _alignmentAgent;
    private readonly ContentGenerationAgent _contentAgent;
    private readonly ILogger<MarketingWorkflow> _logger;

    /// <summary>Minimum alignment score for the top recommendation. Below this, the alignment agent is re-run.</summary>
    private const double AlignmentScoreThreshold = 0.8;

    /// <summary>Maximum number of alignment retries before accepting whatever we have.</summary>
    private const int MaxAlignmentRetries = 2;

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

    public async Task<WorkflowResult> ExecuteAsync()
    {
        _logger.LogInformation("Starting Marketing Workflow (with quality gate, threshold={Threshold})",
            AlignmentScoreThreshold);

        var result = new WorkflowResult
        {
            StartedAt = DateTime.UtcNow
        };

        try
        {
            // ─── Step 1: Market Research ───
            _logger.LogInformation("Step 1: Executing Market Research Agent");
            result.MarketAnalysis = await _researchAgent.ExecuteAsyncTyped();
            _logger.LogInformation("✓ Market Research completed: {Count} insights",
                result.MarketAnalysis.MarketInsights.Count);

            // ─── Step 2: Service Alignment (with quality gate loop) ───
            _logger.LogInformation("Step 2: Executing Service Alignment Agent (quality gate enabled)");

            ServiceAlignment alignment;
            var attempt = 0;

            while (true)
            {
                attempt++;
                alignment = await _alignmentAgent.ExecuteAsyncTyped();
                alignment.MarketAnalysis = result.MarketAnalysis;

                var topScore = alignment.FinabeoServices.Count > 0
                    ? alignment.FinabeoServices.Max(s => s.AlignmentScore)
                    : 0.0;

                var gateDecision = new QualityGateDecision
                {
                    Attempt = attempt,
                    TopAlignmentScore = topScore,
                    Threshold = AlignmentScoreThreshold,
                    ServiceCount = alignment.FinabeoServices.Count,
                    Passed = topScore >= AlignmentScoreThreshold || attempt > MaxAlignmentRetries
                };

                result.QualityGateHistory.Add(gateDecision);

                if (topScore >= AlignmentScoreThreshold)
                {
                    _logger.LogInformation(
                        "✓ Quality gate PASSED on attempt {Attempt}: top score {Score:F2} >= {Threshold:F2} ({Count} services)",
                        attempt, topScore, AlignmentScoreThreshold, alignment.FinabeoServices.Count);
                    break;
                }

                if (attempt > MaxAlignmentRetries)
                {
                    _logger.LogWarning(
                        "⚠ Quality gate ACCEPTED after {MaxRetries} retries: top score {Score:F2} < {Threshold:F2} — proceeding with best available alignment",
                        MaxAlignmentRetries, topScore, AlignmentScoreThreshold);
                    break;
                }

                _logger.LogInformation(
                    "↻ Quality gate FAILED on attempt {Attempt}: top score {Score:F2} < {Threshold:F2} — retrying alignment",
                    attempt, topScore, AlignmentScoreThreshold);
            }

            result.ServiceAlignment = alignment;
            _logger.LogInformation("✓ Service Alignment completed: {Count} recommendations (after {Attempts} attempt(s))",
                alignment.FinabeoServices.Count, attempt);

            // ─── Step 3: Content Generation ───
            _logger.LogInformation("Step 3: Executing Content Generation Agent");
            _contentAgent.SetContext(result.MarketAnalysis, result.ServiceAlignment);
            result.GeneratedContent = await _contentAgent.ExecuteAsyncTyped();
            _logger.LogInformation("✓ Content Generation completed");

            result.CompletedAt = DateTime.UtcNow;
            result.Status = WorkflowStatus.Completed;

            _logger.LogInformation(
                "Workflow completed in {Duration:F2}s — quality gate: {GateAttempts} attempt(s)",
                result.Duration.TotalSeconds, result.QualityGateHistory.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Workflow failed: {Message}", ex.Message);
            result.Status = WorkflowStatus.Failed;
            result.Error = ex.Message;
            result.CompletedAt = DateTime.UtcNow;
            return result;
        }
    }
}

/// <summary>
/// Workflow execution result — includes quality gate history for observability.
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

    [JsonPropertyName("quality_gate")]
    public List<QualityGateDecision> QualityGateHistory { get; set; } = new();

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonIgnore]
    public TimeSpan Duration => (CompletedAt ?? DateTime.UtcNow) - StartedAt;
}

/// <summary>
/// Record of a single quality-gate evaluation. Multiple entries indicate retries.
/// </summary>
public class QualityGateDecision
{
    [JsonPropertyName("attempt")]
    public int Attempt { get; set; }

    [JsonPropertyName("top_alignment_score")]
    public double TopAlignmentScore { get; set; }

    [JsonPropertyName("threshold")]
    public double Threshold { get; set; }

    [JsonPropertyName("service_count")]
    public int ServiceCount { get; set; }

    [JsonPropertyName("passed")]
    public bool Passed { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum WorkflowStatus
{
    Running,
    Completed,
    Failed
}
