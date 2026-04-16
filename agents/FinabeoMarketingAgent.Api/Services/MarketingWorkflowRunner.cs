using System.Text.Json;
using System.Text.Json.Serialization;
using Azure;
using Azure.AI.OpenAI;
using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Formatters;
using FinabeoMarketingAgent.Middleware;
using FinabeoMarketingAgent.Tools;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.AI;

namespace FinabeoMarketingAgent.Api.Services;

public class MarketingWorkflowRunner
{
    private readonly IConfiguration _configuration;
    private readonly ILoggerFactory _loggerFactory;
    private readonly IOutputUploader _outputUploader;
    private readonly CompanyRegistry _companyRegistry;
    private readonly ILogger<MarketingWorkflowRunner> _logger;

    public MarketingWorkflowRunner(
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IOutputUploader outputUploader,
        CompanyRegistry companyRegistry,
        ILogger<MarketingWorkflowRunner> logger)
    {
        _configuration = configuration;
        _loggerFactory = loggerFactory;
        _outputUploader = outputUploader;
        _companyRegistry = companyRegistry;
        _logger = logger;
    }

    /// <summary>
    /// Run the workflow for the specified company. Outputs land in blob storage under
    /// {companyId}/{runId}/* so different companies' runs don't collide.
    /// </summary>
    public async Task<WorkflowRunResult> ExecuteAsync(string companyId)
    {
        if (!_companyRegistry.TryGet(companyId, out var company) || company is null)
        {
            throw new ArgumentException(
                $"Unknown companyId '{companyId}'. Known: {string.Join(", ", _companyRegistry.All.Select(c => c.Id))}",
                nameof(companyId));
        }

        var runId = $"{DateTime.UtcNow:yyyy-MM-dd-HHmmss}";
        _logger.LogInformation("Starting workflow run {RunId} for company {Company}", runId, company.Name);

        var (workflow, telemetry) = CreateWorkflow(company);
        var result = await workflow.ExecuteAsync();

        // Log per-call and cumulative telemetry
        telemetry.LogSummary();
        var summary = telemetry.GetSummary();

        _logger.LogInformation(
            "Workflow completed with status {Status} in {Duration:F2}s — {TotalTokens} tokens across {Calls} LLM calls",
            result.Status, result.Duration.TotalSeconds, summary.TotalTokens, summary.TotalCalls);

        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var jsonContent = JsonSerializer.Serialize(result, jsonOptions);

        // Blob path includes companyId so multiple companies' runs don't mix
        var blobPrefix = $"{company.Id}/{runId}";

        await _outputUploader.UploadTextAsync($"{blobPrefix}/marketing-content.json", jsonContent, "application/json");
        _logger.LogInformation("Uploaded workflow result JSON to {Prefix}", blobPrefix);

        await GenerateAndUploadBrandedOutputsAsync(result, company, blobPrefix);

        return new WorkflowRunResult(
            RunId: runId,
            CompanyId: company.Id,
            CompanyName: company.Name,
            Status: result.Status.ToString(),
            DurationSeconds: result.Duration.TotalSeconds,
            Telemetry: new TelemetryResult(
                LlmCalls: summary.TotalCalls,
                InputTokens: summary.TotalInputTokens,
                OutputTokens: summary.TotalOutputTokens,
                TotalTokens: summary.TotalTokens,
                TotalLlmLatencyMs: Math.Round(summary.TotalLatencyMs, 0)));
    }

    private (MarketingWorkflow Workflow, TelemetryChatClient Telemetry) CreateWorkflow(Company company)
    {
        var endpoint = _configuration["Foundry:Endpoint"]
            ?? throw new InvalidOperationException("Foundry:Endpoint not configured");
        var apiKey = _configuration["Foundry:ApiKey"]
            ?? throw new InvalidOperationException("Foundry:ApiKey not configured");
        var deploymentName = _configuration["Foundry:DeploymentName"] ?? "gpt-5-mini";

        // NetworkTimeout enforces a hard socket-level deadline so a stalled
        // generation (seen on gpt-5-mini with long structured outputs) surfaces
        // as a proper exception instead of hanging the HTTP request forever.
        var options = new AzureOpenAIClientOptions
        {
            NetworkTimeout = TimeSpan.FromSeconds(90)
        };
        var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey), options);
        var rawChatClient = client.GetChatClient(deploymentName).AsIChatClient();

        // Build the IChatClient pipeline:
        //   raw → TelemetryChatClient (logging/metrics) → FunctionInvocation (tool calls)
        //
        // The telemetry layer sits closest to the wire so it captures the real
        // latency and token counts before any tool-call retries inflate the numbers.
        var telemetryClient = new TelemetryChatClient(rawChatClient, _loggerFactory);
        var chatClient = telemetryClient
            .AsBuilder()
            .UseFunctionInvocation()
            .Build();

        var researchAgent = new MarketResearchAgent(chatClient, company,
            _loggerFactory.CreateLogger<MarketResearchAgent>());

        // Tool-calling alignment agent: instead of injecting the service catalog into
        // the system prompt, it gets a toolset and decides when to call which tool.
        // This is the framework-exploration pattern — see CompanyTools.cs.
        var companyTools = new CompanyTools(_companyRegistry).AsAIFunctions();
        var alignmentAgent = new ServiceAlignmentAgent(chatClient, company.Id, companyTools,
            _loggerFactory.CreateLogger<ServiceAlignmentAgent>());

        var contentAgent = new ContentGenerationAgent(chatClient, company,
            _loggerFactory.CreateLogger<ContentGenerationAgent>());

        return (new MarketingWorkflow(
            researchAgent, alignmentAgent, contentAgent,
            _loggerFactory.CreateLogger<MarketingWorkflow>()), telemetryClient);
    }

    private async Task GenerateAndUploadBrandedOutputsAsync(WorkflowResult result, Company company, string blobPrefix)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"{company.Id}-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        try
        {
            var brandingPath = ResolveBrandingPath(company);

            _logger.LogInformation("Generating Word documents for {Company}...", company.Name);
            var wordFormatter = new WordContentFormatter(brandingPath,
                _loggerFactory.CreateLogger<WordContentFormatter>());
            var blogDocPath = await wordFormatter.GenerateBlogDocumentAsync(result);
            await UploadFileAsync(blogDocPath, $"{blobPrefix}/blog-document.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            var reportPath = await wordFormatter.GenerateMarketAnalysisReportAsync(result);
            await UploadFileAsync(reportPath, $"{blobPrefix}/market-analysis-report.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            _logger.LogInformation("Generating PowerPoint deck for {Company}...", company.Name);
            var pptxFormatter = new PowerPointContentFormatter(brandingPath,
                _loggerFactory.CreateLogger<PowerPointContentFormatter>());
            var deckPath = await pptxFormatter.GenerateMarketAnalysisDeckAsync(result);
            await UploadFileAsync(deckPath, $"{blobPrefix}/market-analysis-deck.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation");

            _logger.LogInformation("All branded outputs uploaded for run {Prefix}", blobPrefix);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Some branded outputs could not be generated for {Prefix}", blobPrefix);
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

    /// <summary>
    /// Find the company's branding JSON. Tries deployed location first, then dev tree.
    /// Falls back to Finabeo branding if the company-specific file is missing — this lets
    /// new companies be added in companies.json before their full branding kit exists.
    /// </summary>
    private string ResolveBrandingPath(Company company)
    {
        var brandingFile = string.IsNullOrEmpty(company.BrandingFile)
            ? "finabeo-branding.json"
            : company.BrandingFile;

        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "branding", brandingFile),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "..", "branding", brandingFile),
        };

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
                return Path.GetFullPath(candidate);
        }

        // Fallback: if the company-specific branding doesn't exist, try Finabeo's as a default
        if (brandingFile != "finabeo-branding.json")
        {
            _logger.LogWarning(
                "Branding file '{File}' for {Company} not found — falling back to finabeo-branding.json. " +
                "Add the file to /branding/ to enable proper brand styling.",
                brandingFile, company.Name);
            var fallback = Path.Combine(AppContext.BaseDirectory, "branding", "finabeo-branding.json");
            if (File.Exists(fallback)) return fallback;
        }

        throw new FileNotFoundException(
            $"Branding config not found for {company.Name}. Looked for: {string.Join(", ", candidates)}");
    }
}

public record WorkflowRunResult(
    string RunId,
    string CompanyId,
    string CompanyName,
    string Status,
    double DurationSeconds,
    TelemetryResult? Telemetry = null);

public record TelemetryResult(
    int LlmCalls,
    long InputTokens,
    long OutputTokens,
    long TotalTokens,
    double TotalLlmLatencyMs);
