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
