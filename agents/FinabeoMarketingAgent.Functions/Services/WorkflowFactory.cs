using Azure;
using Azure.AI.OpenAI;
using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Formatters;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Functions.Services;

/// <summary>
/// Creates MarketingWorkflow instances for a specified company using Azure AI Foundry.
/// In production this uses the Foundry API key from app settings; the original Managed Identity
/// path was reverted because Contributor-level deploys can't create roleAssignments
/// (see infra/foundry-setup.bicep note).
/// </summary>
public class WorkflowFactory : IWorkflowFactory
{
    private readonly IConfiguration _configuration;
    private readonly ILoggerFactory _loggerFactory;
    private readonly CompanyRegistry _companyRegistry;

    public WorkflowFactory(
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        CompanyRegistry companyRegistry)
    {
        _configuration = configuration;
        _loggerFactory = loggerFactory;
        _companyRegistry = companyRegistry;
    }

    public MarketingWorkflow Create() => Create("finabeo");

    public MarketingWorkflow Create(string companyId)
    {
        var company = _companyRegistry.Get(companyId);

        var endpoint = _configuration["Foundry__Endpoint"]
            ?? throw new InvalidOperationException("Foundry__Endpoint not configured");
        var apiKey = _configuration["Foundry__ApiKey"]
            ?? throw new InvalidOperationException("Foundry__ApiKey not configured");
        var deploymentName = _configuration["Foundry__DeploymentName"] ?? "gpt-5-mini";

        var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        var chatClient = client.GetChatClient(deploymentName).AsIChatClient();

        var researchAgent = new MarketResearchAgent(chatClient,
            _loggerFactory.CreateLogger<MarketResearchAgent>());

        var alignmentAgent = new ServiceAlignmentAgent(chatClient, company,
            _loggerFactory.CreateLogger<ServiceAlignmentAgent>());

        var contentAgent = new ContentGenerationAgent(chatClient,
            _loggerFactory.CreateLogger<ContentGenerationAgent>());

        return new MarketingWorkflow(
            researchAgent,
            alignmentAgent,
            contentAgent,
            _loggerFactory.CreateLogger<MarketingWorkflow>());
    }

    public WordContentFormatter CreateWordFormatter() => CreateWordFormatter("finabeo");

    public WordContentFormatter CreateWordFormatter(string companyId)
    {
        var brandingPath = GetBrandingConfigPath(companyId);
        return new WordContentFormatter(brandingPath,
            _loggerFactory.CreateLogger<WordContentFormatter>());
    }

    public PowerPointContentFormatter CreatePowerPointFormatter() => CreatePowerPointFormatter("finabeo");

    public PowerPointContentFormatter CreatePowerPointFormatter(string companyId)
    {
        var brandingPath = GetBrandingConfigPath(companyId);
        return new PowerPointContentFormatter(brandingPath,
            _loggerFactory.CreateLogger<PowerPointContentFormatter>());
    }

    private string GetBrandingConfigPath(string companyId)
    {
        var brandingFile = "finabeo-branding.json";
        if (_companyRegistry.TryGet(companyId, out var company) && company is not null && !string.IsNullOrEmpty(company.BrandingFile))
        {
            brandingFile = company.BrandingFile;
        }

        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "branding", brandingFile),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "..", "branding", brandingFile),
            // Fallback to Finabeo branding if company-specific file isn't deployed
            Path.Combine(AppContext.BaseDirectory, "branding", "finabeo-branding.json"),
        };

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
                return Path.GetFullPath(candidate);
        }

        throw new FileNotFoundException(
            $"Branding config not found for company '{companyId}'. Looked for: {string.Join(", ", candidates)}");
    }
}
