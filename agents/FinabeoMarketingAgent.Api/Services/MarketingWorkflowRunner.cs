using System.Text.Json;
using System.Text.Json.Serialization;
using Azure;
using Azure.AI.OpenAI;
using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Formatters;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.AI;

namespace FinabeoMarketingAgent.Api.Services;

public class MarketingWorkflowRunner
{
    private readonly IConfiguration _configuration;
    private readonly ILoggerFactory _loggerFactory;
    private readonly IOutputUploader _outputUploader;
    private readonly ILogger<MarketingWorkflowRunner> _logger;

    public MarketingWorkflowRunner(
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IOutputUploader outputUploader,
        ILogger<MarketingWorkflowRunner> logger)
    {
        _configuration = configuration;
        _loggerFactory = loggerFactory;
        _outputUploader = outputUploader;
        _logger = logger;
    }

    public async Task<WorkflowRunResult> ExecuteAsync()
    {
        var runId = $"{DateTime.UtcNow:yyyy-MM-dd-HHmmss}";
        _logger.LogInformation("Starting workflow run: {RunId}", runId);

        var workflow = CreateWorkflow();
        var result = await workflow.ExecuteAsync();

        _logger.LogInformation(
            "Workflow completed with status {Status} in {Duration:F2}s",
            result.Status, result.Duration.TotalSeconds);

        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var jsonContent = JsonSerializer.Serialize(result, jsonOptions);

        await _outputUploader.UploadTextAsync($"{runId}/marketing-content.json", jsonContent, "application/json");
        _logger.LogInformation("Uploaded workflow result JSON");

        await GenerateAndUploadBrandedOutputsAsync(result, runId);

        return new WorkflowRunResult(
            RunId: runId,
            Status: result.Status.ToString(),
            DurationSeconds: result.Duration.TotalSeconds);
    }

    private MarketingWorkflow CreateWorkflow()
    {
        var endpoint = _configuration["Foundry__Endpoint"]
            ?? throw new InvalidOperationException("Foundry__Endpoint not configured");
        var apiKey = _configuration["Foundry__ApiKey"]
            ?? throw new InvalidOperationException("Foundry__ApiKey not configured");
        var deploymentName = _configuration["Foundry__DeploymentName"] ?? "gpt-5-mini";

        var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        var chatClient = client.GetChatClient(deploymentName).AsIChatClient();

        var finabeoServices = _configuration
            .GetSection("FinabeoServices")
            .Get<List<FinabeoService>>() ?? new List<FinabeoService>();

        var researchAgent = new MarketResearchAgent(chatClient,
            _loggerFactory.CreateLogger<MarketResearchAgent>());
        var alignmentAgent = new FinabeoAlignmentAgent(chatClient, finabeoServices,
            _loggerFactory.CreateLogger<FinabeoAlignmentAgent>());
        var contentAgent = new ContentGenerationAgent(chatClient,
            _loggerFactory.CreateLogger<ContentGenerationAgent>());

        return new MarketingWorkflow(
            researchAgent, alignmentAgent, contentAgent,
            _loggerFactory.CreateLogger<MarketingWorkflow>());
    }

    private async Task GenerateAndUploadBrandedOutputsAsync(WorkflowResult result, string runId)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"finabeo-{runId}");
        Directory.CreateDirectory(tempDir);

        try
        {
            var brandingPath = GetBrandingConfigPath();

            _logger.LogInformation("Generating Word documents...");
            var wordFormatter = new WordContentFormatter(brandingPath,
                _loggerFactory.CreateLogger<WordContentFormatter>());
            var blogDocPath = await wordFormatter.GenerateBlogDocumentAsync(result);
            await UploadFileAsync(blogDocPath, $"{runId}/blog-document.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            var reportPath = await wordFormatter.GenerateMarketAnalysisReportAsync(result);
            await UploadFileAsync(reportPath, $"{runId}/market-analysis-report.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            _logger.LogInformation("Generating PowerPoint deck...");
            var pptxFormatter = new PowerPointContentFormatter(brandingPath,
                _loggerFactory.CreateLogger<PowerPointContentFormatter>());
            var deckPath = await pptxFormatter.GenerateMarketAnalysisDeckAsync(result);
            await UploadFileAsync(deckPath, $"{runId}/market-analysis-deck.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation");

            _logger.LogInformation("All branded outputs uploaded for run {RunId}", runId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Some branded outputs could not be generated for run {RunId}", runId);
        }
        finally
        {
            try { Directory.Delete(tempDir, recursive: true); } catch { }
        }
    }

    private async Task UploadFileAsync(string localPath, string blobName, string contentType)
    {
        if (!File.Exists(localPath))
        {
            _logger.LogWarning("Output file not found: {Path}", localPath);
            return;
        }

        var content = await File.ReadAllBytesAsync(localPath);
        await _outputUploader.UploadBytesAsync(blobName, content, contentType);
        _logger.LogInformation("Uploaded: {BlobName} ({Size} bytes)", blobName, content.Length);
    }

    private static string GetBrandingConfigPath()
    {
        var localPath = Path.Combine(AppContext.BaseDirectory, "branding", "finabeo-branding.json");
        if (File.Exists(localPath)) return localPath;

        var devPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "..", "branding", "finabeo-branding.json");
        if (File.Exists(devPath)) return devPath;

        throw new FileNotFoundException(
            "Finabeo branding config not found. Ensure finabeo-branding.json is deployed with the app.");
    }
}

public record WorkflowRunResult(string RunId, string Status, double DurationSeconds);
