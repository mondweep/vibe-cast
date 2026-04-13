using Azure.AI.Projects;
using Azure.Identity;
using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Formatters;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Functions.Services;

/// <summary>
/// Creates MarketingWorkflow instances using Azure AI Foundry via Managed Identity.
/// In production, no API keys are needed — DefaultAzureCredential handles auth
/// through the Function App's system-assigned managed identity.
/// </summary>
public class WorkflowFactory : IWorkflowFactory
{
    private readonly IConfiguration _configuration;
    private readonly ILoggerFactory _loggerFactory;

    public WorkflowFactory(IConfiguration configuration, ILoggerFactory loggerFactory)
    {
        _configuration = configuration;
        _loggerFactory = loggerFactory;
    }

    public MarketingWorkflow Create()
    {
        var endpoint = _configuration["Foundry__Endpoint"]
            ?? throw new InvalidOperationException("Foundry__Endpoint not configured");

        // Use Managed Identity in production, falls back to Azure CLI for local dev
        var client = new AIProjectClient(
            new Uri(endpoint),
            new DefaultAzureCredential());

        var chatClient = client.ProjectOpenAIClient.GetChatClient("gpt-4o").AsIChatClient();

        // Load Finabeo service definitions
        var finabeoServices = _configuration
            .GetSection("FinabeoServices")
            .Get<List<FinabeoService>>() ?? new List<FinabeoService>();

        // Create agents
        var researchAgent = new MarketResearchAgent(chatClient,
            _loggerFactory.CreateLogger<MarketResearchAgent>());

        var alignmentAgent = new FinabeoAlignmentAgent(chatClient, finabeoServices,
            _loggerFactory.CreateLogger<FinabeoAlignmentAgent>());

        var contentAgent = new ContentGenerationAgent(chatClient,
            _loggerFactory.CreateLogger<ContentGenerationAgent>());

        return new MarketingWorkflow(
            researchAgent,
            alignmentAgent,
            contentAgent,
            _loggerFactory.CreateLogger<MarketingWorkflow>());
    }

    public WordContentFormatter CreateWordFormatter()
    {
        var brandingPath = GetBrandingConfigPath();
        return new WordContentFormatter(brandingPath,
            _loggerFactory.CreateLogger<WordContentFormatter>());
    }

    public PowerPointContentFormatter CreatePowerPointFormatter()
    {
        var brandingPath = GetBrandingConfigPath();
        return new PowerPointContentFormatter(brandingPath,
            _loggerFactory.CreateLogger<PowerPointContentFormatter>());
    }

    private string GetBrandingConfigPath()
    {
        // In Azure Functions, the branding config is deployed alongside the function
        var localPath = Path.Combine(AppContext.BaseDirectory, "branding", "finabeo-branding.json");
        if (File.Exists(localPath))
            return localPath;

        // Fallback: relative path for development
        var devPath = Path.Combine(Directory.GetCurrentDirectory(),
            "..", "..", "..", "..", "branding", "finabeo-branding.json");
        if (File.Exists(devPath))
            return devPath;

        throw new FileNotFoundException(
            "Finabeo branding config not found. Ensure finabeo-branding.json is deployed with the function.");
    }
}
