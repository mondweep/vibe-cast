using System.Diagnostics;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Middleware;

/// <summary>
/// A delegating <see cref="IChatClient"/> that wraps the inner client and logs
/// per-call latency, token usage, and model metadata.
///
/// Inserted into the pipeline via <c>ChatClientBuilder.Use()</c>, this middleware
/// is transparent to agents — they call <c>GetResponseAsync</c> as normal and
/// the telemetry layer captures metrics without modifying request or response.
///
/// This is a framework-exploration exercise: we want to know whether the
/// <c>Microsoft.Extensions.AI</c> pipeline pattern (the same chain-of-responsibility
/// model as ASP.NET Core middleware) is genuinely useful for cross-cutting concerns
/// or just decoration.
///
/// Usage:
/// <code>
/// var chatClient = rawClient
///     .AsBuilder()
///     .Use(inner => new TelemetryChatClient(inner, loggerFactory))
///     .UseFunctionInvocation()
///     .Build();
/// </code>
/// </summary>
public class TelemetryChatClient : DelegatingChatClient
{
    private readonly ILogger _logger;
    private readonly Stopwatch _sessionStopwatch;

    // Cumulative counters across all calls in this client's lifetime
    private int _callCount;
    private long _totalInputTokens;
    private long _totalOutputTokens;
    private double _totalLatencyMs;

    public TelemetryChatClient(IChatClient innerClient, ILoggerFactory loggerFactory)
        : base(innerClient)
    {
        _logger = loggerFactory.CreateLogger<TelemetryChatClient>();
        _sessionStopwatch = Stopwatch.StartNew();
    }

    public override async Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var callNumber = Interlocked.Increment(ref _callCount);
        var sw = Stopwatch.StartNew();

        _logger.LogInformation(
            "[Telemetry] Call #{CallNumber} starting | Model: {Model} | Tools: {ToolCount}",
            callNumber,
            options?.ModelId ?? "(default)",
            options?.Tools?.Count ?? 0);

        ChatResponse response;
        try
        {
            response = await base.GetResponseAsync(messages, options, cancellationToken);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex,
                "[Telemetry] Call #{CallNumber} FAILED after {ElapsedMs:F0}ms",
                callNumber, sw.Elapsed.TotalMilliseconds);
            throw;
        }

        sw.Stop();
        var elapsedMs = sw.Elapsed.TotalMilliseconds;

        // Extract token usage if the provider returns it
        var inputTokens = response.Usage?.InputTokenCount ?? 0;
        var outputTokens = response.Usage?.OutputTokenCount ?? 0;
        var totalTokens = response.Usage?.TotalTokenCount ?? (inputTokens + outputTokens);

        // Update cumulative counters
        Interlocked.Add(ref _totalInputTokens, inputTokens);
        Interlocked.Add(ref _totalOutputTokens, outputTokens);
        // Approximate — not perfectly thread-safe for doubles, but fine for logging
        _totalLatencyMs += elapsedMs;

        _logger.LogInformation(
            "[Telemetry] Call #{CallNumber} completed in {ElapsedMs:F0}ms | " +
            "Tokens: {InputTokens} in / {OutputTokens} out / {TotalTokens} total | " +
            "FinishReason: {FinishReason}",
            callNumber,
            elapsedMs,
            inputTokens,
            outputTokens,
            totalTokens,
            response.FinishReason?.ToString() ?? "unknown");

        return response;
    }

    /// <summary>
    /// Returns a summary of all calls made through this client instance.
    /// Useful for logging at the end of a workflow run.
    /// </summary>
    public TelemetrySummary GetSummary() => new(
        TotalCalls: _callCount,
        TotalInputTokens: _totalInputTokens,
        TotalOutputTokens: _totalOutputTokens,
        TotalTokens: _totalInputTokens + _totalOutputTokens,
        TotalLatencyMs: _totalLatencyMs,
        SessionElapsedMs: _sessionStopwatch.Elapsed.TotalMilliseconds);

    /// <summary>
    /// Logs the cumulative summary. Call at the end of a workflow run.
    /// </summary>
    public void LogSummary()
    {
        var s = GetSummary();
        _logger.LogInformation(
            "[Telemetry] ═══ Session Summary ═══\n" +
            "  Calls:         {TotalCalls}\n" +
            "  Input tokens:  {InputTokens}\n" +
            "  Output tokens: {OutputTokens}\n" +
            "  Total tokens:  {TotalTokens}\n" +
            "  Total latency: {LatencyMs:F0}ms\n" +
            "  Session time:  {SessionMs:F0}ms",
            s.TotalCalls,
            s.TotalInputTokens,
            s.TotalOutputTokens,
            s.TotalTokens,
            s.TotalLatencyMs,
            s.SessionElapsedMs);
    }
}

/// <summary>
/// Immutable snapshot of telemetry metrics for a workflow run.
/// </summary>
public record TelemetrySummary(
    int TotalCalls,
    long TotalInputTokens,
    long TotalOutputTokens,
    long TotalTokens,
    double TotalLatencyMs,
    double SessionElapsedMs);
