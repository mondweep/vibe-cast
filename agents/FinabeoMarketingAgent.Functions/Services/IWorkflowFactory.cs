using FinabeoMarketingAgent.Formatters;
using FinabeoMarketingAgent.Workflow;

namespace FinabeoMarketingAgent.Functions.Services;

/// <summary>
/// Factory for creating workflow instances and branded content formatters.
/// Uses Managed Identity (DefaultAzureCredential) to connect to Azure AI Foundry.
/// </summary>
public interface IWorkflowFactory
{
    /// <summary>Create a new MarketingWorkflow instance connected to Foundry</summary>
    MarketingWorkflow Create();

    /// <summary>Create a Word document formatter with Finabeo branding</summary>
    WordContentFormatter CreateWordFormatter();

    /// <summary>Create a PowerPoint formatter with Finabeo branding</summary>
    PowerPointContentFormatter CreatePowerPointFormatter();
}
