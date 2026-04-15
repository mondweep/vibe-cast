using FinabeoMarketingAgent.Formatters;
using FinabeoMarketingAgent.Workflow;

namespace FinabeoMarketingAgent.Functions.Services;

/// <summary>
/// Factory for creating workflow instances and branded content formatters,
/// scoped to a specific company from the CompanyRegistry. The parameterless
/// overloads default to "finabeo" for backwards compatibility with existing callers.
/// </summary>
public interface IWorkflowFactory
{
    /// <summary>Create a workflow for the default company (Finabeo).</summary>
    MarketingWorkflow Create();

    /// <summary>Create a workflow for the specified company id (e.g. "finabeo", "brigade-electronics").</summary>
    MarketingWorkflow Create(string companyId);

    WordContentFormatter CreateWordFormatter();
    WordContentFormatter CreateWordFormatter(string companyId);

    PowerPointContentFormatter CreatePowerPointFormatter();
    PowerPointContentFormatter CreatePowerPointFormatter(string companyId);
}
