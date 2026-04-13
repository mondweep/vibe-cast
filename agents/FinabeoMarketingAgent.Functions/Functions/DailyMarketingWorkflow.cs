using System.Text.Json;
using System.Text.Json.Serialization;
using FinabeoMarketingAgent.Functions.Services;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Functions;

/// <summary>
/// Timer-triggered function that runs the marketing workflow daily at 8 AM UTC.
/// Generates market research, service alignment, and multi-platform content,
/// then uploads all outputs (JSON, DOCX, PPTX, images) to Azure Blob Storage.
/// </summary>
public class DailyMarketingWorkflow
{
    private readonly IWorkflowFactory _workflowFactory;
    private readonly IOutputUploader _outputUploader;
    private readonly ILogger<DailyMarketingWorkflow> _logger;

    public DailyMarketingWorkflow(
        IWorkflowFactory workflowFactory,
        IOutputUploader outputUploader,
        ILogger<DailyMarketingWorkflow> logger)
    {
        _workflowFactory = workflowFactory;
        _outputUploader = outputUploader;
        _logger = logger;
    }

    /// <summary>
    /// Runs daily at 8:00 AM UTC (CRON: 0 0 8 * * *)
    /// </summary>
    [Function("DailyMarketingWorkflow")]
    public async Task RunAsync(
        [TimerTrigger("0 0 8 * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation("Daily Marketing Workflow triggered at {Time}", DateTime.UtcNow);

        if (timerInfo.IsPastDue)
        {
            _logger.LogWarning("Timer is past due — running catch-up execution");
        }

        await ExecuteWorkflowAsync();

        _logger.LogInformation("Next scheduled run: {NextRun}", timerInfo.ScheduleStatus?.Next);
    }

    /// <summary>
    /// Shared workflow execution used by both timer and HTTP triggers
    /// </summary>
    internal async Task<WorkflowResult> ExecuteWorkflowAsync()
    {
        var runId = $"{DateTime.UtcNow:yyyy-MM-dd-HHmmss}";
        _logger.LogInformation("Starting workflow run: {RunId}", runId);

        try
        {
            // Create and execute the multi-agent workflow
            var workflow = _workflowFactory.Create();
            var result = await workflow.ExecuteAsync();

            _logger.LogInformation(
                "Workflow completed with status {Status} in {Duration:F2}s",
                result.Status,
                result.Duration.TotalSeconds);

            // Serialize workflow result to JSON
            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var jsonContent = JsonSerializer.Serialize(result, jsonOptions);

            // Upload JSON result
            var jsonBlobName = $"{runId}/marketing-content.json";
            await _outputUploader.UploadTextAsync(jsonBlobName, jsonContent, "application/json");
            _logger.LogInformation("Uploaded workflow result: {BlobName}", jsonBlobName);

            // Generate and upload branded outputs
            await GenerateAndUploadBrandedOutputsAsync(result, runId);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Workflow run {RunId} failed", runId);
            throw;
        }
    }

    /// <summary>
    /// Generate DOCX, PPTX, and image outputs, then upload each to blob storage
    /// </summary>
    private async Task GenerateAndUploadBrandedOutputsAsync(WorkflowResult result, string runId)
    {
        // Generate outputs to a temporary directory
        var tempDir = Path.Combine(Path.GetTempPath(), $"finabeo-{runId}");
        Directory.CreateDirectory(tempDir);

        try
        {
            // Word documents
            _logger.LogInformation("Generating Word documents...");
            var wordFormatter = _workflowFactory.CreateWordFormatter();
            var blogDocPath = await wordFormatter.GenerateBlogDocumentAsync(result);
            await UploadFileAsync(blogDocPath, $"{runId}/blog-document.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            var reportPath = await wordFormatter.GenerateMarketAnalysisReportAsync(result);
            await UploadFileAsync(reportPath, $"{runId}/market-analysis-report.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            // PowerPoint deck
            _logger.LogInformation("Generating PowerPoint deck...");
            var pptxFormatter = _workflowFactory.CreatePowerPointFormatter();
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
            // Clean up temp directory
            try { Directory.Delete(tempDir, recursive: true); }
            catch { /* best effort cleanup */ }
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
}
