using Azure.Identity;
using Azure.Storage.Blobs;
using FinabeoMarketingAgent.Api.Services;
using FinabeoMarketingAgent.Config;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();

// ─── Azure Blob storage ───
builder.Services.AddSingleton(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var connectionString = config["AzureStorage:ConnectionString"];
    if (!string.IsNullOrEmpty(connectionString))
    {
        return new BlobServiceClient(connectionString);
    }

    var endpoint = config["AzureStorage:BlobEndpoint"];
    if (!string.IsNullOrEmpty(endpoint))
    {
        return new BlobServiceClient(new Uri(endpoint), new DefaultAzureCredential());
    }

    throw new InvalidOperationException(
        "Either AzureStorage:ConnectionString or AzureStorage:BlobEndpoint must be configured");
});

// ─── Company registry (loads Finabeo, Brigade Electronics, etc. from companies.json) ───
builder.Services.AddSingleton(sp =>
{
    var configPath = CompanyRegistry.ResolveDefaultConfigPath();
    var logger = sp.GetRequiredService<ILogger<CompanyRegistry>>();
    var registry = CompanyRegistry.LoadFromFile(configPath);
    logger.LogInformation("Loaded {Count} companies from {Path}: {Names}",
        registry.All.Count,
        configPath,
        string.Join(", ", registry.All.Select(c => c.Name)));
    return registry;
});

builder.Services.AddSingleton<IOutputUploader, BlobOutputUploader>();
builder.Services.AddSingleton<MarketingWorkflowRunner>();
builder.Services.AddSingleton<RunListingService>();
builder.Services.AddSingleton<PendingApprovalStore>();
builder.Services.AddSingleton<TeamsNotifier>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "FinabeoMarketingAgent.Api",
    timestamp = DateTime.UtcNow
}));

// ─── List supported companies (used by the frontend dropdown) ───
app.MapGet("/api/companies", (CompanyRegistry registry) =>
{
    var companies = registry.All
        .OrderBy(c => c.Name)
        .Select(c => new
        {
            id = c.Id,
            name = c.Name,
            description = c.Description,
            targetIndustries = c.TargetIndustries,
            services = c.Services.Select(s => new { id = s.Id, name = s.Name }).ToList()
        });
    return Results.Ok(companies);
});

// ─── Trigger a workflow run for a specific company ───
app.MapPost("/api/generate", async (
    GenerateRequest? request,
    MarketingWorkflowRunner runner,
    CompanyRegistry registry,
    ILogger<Program> logger) =>
{
    // Default to Finabeo if no companyId is provided — preserves existing demo behaviour
    var companyId = string.IsNullOrWhiteSpace(request?.CompanyId) ? "finabeo" : request.CompanyId.Trim();

    if (!registry.TryGet(companyId, out _))
    {
        return Results.BadRequest(new
        {
            error = $"Unknown companyId '{companyId}'",
            knownCompanies = registry.All.Select(c => c.Id).ToArray()
        });
    }

    logger.LogInformation("On-demand workflow triggered via HTTP for company {CompanyId}", companyId);
    try
    {
        var result = await runner.ExecuteAsync(companyId);
        return Results.Ok(new
        {
            runId = result.RunId,
            companyId = result.CompanyId,
            companyName = result.CompanyName,
            status = result.Status,
            durationSeconds = result.DurationSeconds,
            telemetry = result.Telemetry is { } t ? new
            {
                llmCalls = t.LlmCalls,
                inputTokens = t.InputTokens,
                outputTokens = t.OutputTokens,
                totalTokens = t.TotalTokens,
                totalLlmLatencyMs = t.TotalLlmLatencyMs
            } : null,
            message = $"Workflow completed for {result.CompanyName}. Outputs uploaded to blob storage."
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "On-demand workflow failed for {CompanyId}", companyId);
        return Results.Problem(detail: ex.Message, statusCode: 500, title: "Workflow failed");
    }
});

// ─── Human-in-the-loop: generate with approval gate ───
app.MapPost("/api/generate-with-approval", async (
    GenerateRequest? request,
    MarketingWorkflowRunner runner,
    CompanyRegistry registry,
    PendingApprovalStore pendingStore,
    TeamsNotifier teams,
    ILogger<Program> logger) =>
{
    var companyId = string.IsNullOrWhiteSpace(request?.CompanyId) ? "finabeo" : request.CompanyId.Trim();

    if (!registry.TryGet(companyId, out _))
    {
        return Results.BadRequest(new
        {
            error = $"Unknown companyId '{companyId}'",
            knownCompanies = registry.All.Select(c => c.Id).ToArray()
        });
    }

    logger.LogInformation("[HITL] Generating content for {CompanyId} — will hold for approval", companyId);
    try
    {
        var (runResult, workflowResult, company) = await runner.GenerateAsync(companyId);

        // Hold the result in memory pending human approval
        pendingStore.Add(new PendingRun
        {
            RunId = runResult.RunId,
            CompanyId = company.Id,
            CompanyName = company.Name,
            CreatedAt = DateTime.UtcNow,
            WorkflowResult = workflowResult,
            Company = company,
            RunResult = runResult
        });

        // Notify via Teams (if webhook configured)
        var focus = workflowResult.ServiceAlignment?.RecommendedFocus ?? "";
        await teams.NotifyPendingApprovalAsync(
            runResult.RunId, company.Name, focus,
            runResult.DurationSeconds,
            runResult.Telemetry?.LlmCalls ?? 0,
            runResult.Telemetry?.TotalTokens ?? 0);

        return Results.Ok(new
        {
            runId = runResult.RunId,
            companyId = runResult.CompanyId,
            companyName = runResult.CompanyName,
            status = "pending_approval",
            durationSeconds = runResult.DurationSeconds,
            telemetry = runResult.Telemetry is { } t ? new
            {
                llmCalls = t.LlmCalls,
                inputTokens = t.InputTokens,
                outputTokens = t.OutputTokens,
                totalTokens = t.TotalTokens,
                totalLlmLatencyMs = t.TotalLlmLatencyMs
            } : null,
            approvalUrl = $"/approve.html?runId={runResult.RunId}",
            teamsNotified = teams.IsConfigured,
            message = $"Content generated for {company.Name}. Awaiting approval at /approve.html?runId={runResult.RunId}"
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[HITL] Generation failed for {CompanyId}", companyId);
        return Results.Problem(detail: ex.Message, statusCode: 500, title: "Generation failed");
    }
});

// ─── Get pending run details (used by approval page) ───
app.MapGet("/api/pending/{runId}", (string runId, PendingApprovalStore store) =>
{
    if (!store.TryGet(runId, out var run) || run is null)
        return Results.NotFound(new { error = $"Run '{runId}' not found in pending approvals" });

    var linkedin = run.WorkflowResult.GeneratedContent?.Content?.LinkedIn?.Post ?? "";
    var blogTitle = run.WorkflowResult.GeneratedContent?.Content?.Blog?.Title ?? "";

    return Results.Ok(new
    {
        runId = run.RunId,
        companyId = run.CompanyId,
        companyName = run.CompanyName,
        createdAt = run.CreatedAt,
        recommendedFocus = run.WorkflowResult.ServiceAlignment?.RecommendedFocus ?? "",
        durationSeconds = run.RunResult.DurationSeconds,
        llmCalls = run.RunResult.Telemetry?.LlmCalls ?? 0,
        totalTokens = run.RunResult.Telemetry?.TotalTokens ?? 0,
        linkedInPreview = linkedin,
        blogTitle
    });
});

// ─── Approve a pending run → upload to blob ───
app.MapPost("/api/pending/{runId}/approve", async (
    string runId,
    PendingApprovalStore store,
    MarketingWorkflowRunner runner,
    ILogger<Program> logger) =>
{
    if (!store.TryRemove(runId, out var run) || run is null)
        return Results.NotFound(new { error = $"Run '{runId}' not found or already processed" });

    logger.LogInformation("[HITL] ✓ Run {RunId} APPROVED — uploading outputs", runId);
    await runner.UploadAsync(run.RunId, run.WorkflowResult, run.Company);

    return Results.Ok(new
    {
        runId = run.RunId,
        status = "approved",
        message = $"Run {run.RunId} approved. Outputs uploaded to blob storage for {run.CompanyName}."
    });
});

// ─── Reject a pending run → discard ───
app.MapPost("/api/pending/{runId}/reject", (
    string runId,
    PendingApprovalStore store,
    ILogger<Program> logger) =>
{
    if (!store.TryRemove(runId, out var run) || run is null)
        return Results.NotFound(new { error = $"Run '{runId}' not found or already processed" });

    logger.LogInformation("[HITL] ✗ Run {RunId} REJECTED — discarding outputs", runId);

    return Results.Ok(new
    {
        runId = run.RunId,
        status = "rejected",
        message = $"Run {run.RunId} rejected. Content for {run.CompanyName} has been discarded."
    });
});

// ─── List all pending runs ───
app.MapGet("/api/pending", (PendingApprovalStore store) =>
{
    return Results.Ok(store.ListPending());
});

app.MapGet("/api/runs", async (RunListingService listing, ILogger<Program> logger, CancellationToken ct) =>
{
    try
    {
        var runs = await listing.ListRunsAsync(ct);
        return Results.Ok(runs);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to list runs");
        return Results.Problem(detail: ex.Message, statusCode: 500, title: "Listing failed");
    }
});

app.Run("http://0.0.0.0:8080");

/// <summary>
/// Optional request body for POST /api/generate. If omitted or companyId is null,
/// the workflow defaults to "finabeo" so existing curl scripts keep working.
/// </summary>
record GenerateRequest(string? CompanyId);
