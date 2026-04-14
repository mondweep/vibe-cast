using Azure.Identity;
using Azure.Storage.Blobs;
using FinabeoMarketingAgent.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();

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

builder.Services.AddSingleton<IOutputUploader, BlobOutputUploader>();
builder.Services.AddSingleton<MarketingWorkflowRunner>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "FinabeoMarketingAgent.Api",
    timestamp = DateTime.UtcNow
}));

app.MapPost("/api/generate", async (MarketingWorkflowRunner runner, ILogger<Program> logger) =>
{
    logger.LogInformation("On-demand workflow triggered via HTTP");
    try
    {
        var result = await runner.ExecuteAsync();
        return Results.Ok(new
        {
            runId = result.RunId,
            status = result.Status,
            durationSeconds = result.DurationSeconds,
            message = "Workflow completed. Outputs uploaded to blob storage."
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "On-demand workflow failed");
        return Results.Problem(detail: ex.Message, statusCode: 500, title: "Workflow failed");
    }
});

app.Run("http://0.0.0.0:8080");
