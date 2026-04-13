using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using FinabeoMarketingAgent.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Functions;

/// <summary>
/// HTTP-triggered function for on-demand workflow execution.
/// Useful for testing, demos, or triggering content generation outside the daily schedule.
/// </summary>
public class OnDemandWorkflow
{
    private readonly DailyMarketingWorkflow _dailyWorkflow;
    private readonly ILogger<OnDemandWorkflow> _logger;

    public OnDemandWorkflow(
        DailyMarketingWorkflow dailyWorkflow,
        ILogger<OnDemandWorkflow> logger)
    {
        _dailyWorkflow = dailyWorkflow;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/generate — triggers workflow on demand
    /// </summary>
    [Function("OnDemandWorkflow")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "generate")] HttpRequestData req)
    {
        _logger.LogInformation("On-demand workflow triggered via HTTP");

        try
        {
            var result = await _dailyWorkflow.ExecuteWorkflowAsync();

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json");

            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            await response.WriteStringAsync(JsonSerializer.Serialize(new
            {
                status = result.Status.ToString(),
                durationSeconds = result.Duration.TotalSeconds,
                message = "Workflow completed. Outputs uploaded to blob storage."
            }, jsonOptions));

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "On-demand workflow failed");

            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            errorResponse.Headers.Add("Content-Type", "application/json");
            await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new
            {
                error = ex.Message,
                status = "Failed"
            }));

            return errorResponse;
        }
    }

    /// <summary>
    /// GET /api/health — simple health check
    /// </summary>
    [Function("HealthCheck")]
    public HttpResponseData HealthCheck(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData req)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        response.WriteString(JsonSerializer.Serialize(new
        {
            status = "healthy",
            service = "FinabeoMarketingAgent.Functions",
            timestamp = DateTime.UtcNow
        }));

        return response;
    }
}
