using System.Collections.Concurrent;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Workflow;

namespace FinabeoMarketingAgent.Api.Services;

/// <summary>
/// In-memory store for workflow runs awaiting human approval.
///
/// This is the human-in-the-loop exploration piece. The framework has no native
/// pause/resume — so we implement it ourselves: the workflow generates content,
/// we hold it in memory, notify the human via Teams, and wait for an HTTP callback.
///
/// Production note: this is in-memory and lost on restart. A real implementation
/// would persist to blob storage or a database. The framework provides
/// AgentSession.StateBag for conversation-scoped state, but nothing for
/// workflow-step persistence — confirming the spike finding.
/// </summary>
public class PendingApprovalStore
{
    private readonly ConcurrentDictionary<string, PendingRun> _pending = new();

    public void Add(PendingRun run) => _pending[run.RunId] = run;

    public bool TryGet(string runId, out PendingRun? run) => _pending.TryGetValue(runId, out run);

    public bool TryRemove(string runId, out PendingRun? run) => _pending.TryRemove(runId, out run);

    public IReadOnlyList<PendingRunSummary> ListPending() =>
        _pending.Values
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new PendingRunSummary(
                r.RunId, r.CompanyId, r.CompanyName, r.CreatedAt,
                r.WorkflowResult.ServiceAlignment?.RecommendedFocus ?? ""))
            .ToList();
}

public class PendingRun
{
    public required string RunId { get; init; }
    public required string CompanyId { get; init; }
    public required string CompanyName { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required WorkflowResult WorkflowResult { get; init; }
    public required Company Company { get; init; }
    public required WorkflowRunResult RunResult { get; init; }
}

public record PendingRunSummary(
    string RunId,
    string CompanyId,
    string CompanyName,
    DateTime CreatedAt,
    string RecommendedFocus);
