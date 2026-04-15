using System.ComponentModel;
using System.Text.Json;
using FinabeoMarketingAgent.Config;
using Microsoft.Extensions.AI;

namespace FinabeoMarketingAgent.Tools;

/// <summary>
/// Function-calling tools that let an agent fetch company information on demand
/// instead of receiving everything baked into a system prompt.
///
/// This is the framework-exploration piece — using <see cref="AIFunctionFactory"/>
/// from Microsoft.Extensions.AI to expose plain methods as tools the LLM can invoke.
/// The agent decides when to call them; the framework handles the round-trip.
///
/// Usage:
/// <code>
/// var tools = new CompanyTools(registry).AsAIFunctions();
/// var chatClient = rawClient.AsBuilder().UseFunctionInvocation().Build();
/// var options = new ChatOptions { Tools = tools };
/// var response = await chatClient.GetResponseAsync(messages, options);
/// </code>
/// </summary>
public class CompanyTools
{
    private readonly CompanyRegistry _registry;

    public CompanyTools(CompanyRegistry registry)
    {
        _registry = registry;
    }

    /// <summary>
    /// Build the AIFunction array to attach to a ChatOptions.Tools.
    /// Each method below is exposed; XML-doc summaries become the tool descriptions
    /// the LLM sees when deciding whether to call them.
    /// </summary>
    public IList<AITool> AsAIFunctions() =>
    [
        AIFunctionFactory.Create(GetCompanyServices),
        AIFunctionFactory.Create(GetCompanyTargetIndustries),
        AIFunctionFactory.Create(GetCompanyVoice),
        AIFunctionFactory.Create(ListAvailableCompanies)
    ];

    [Description("Returns the full service catalog for a company, including each service's name, description, benefits, target industries, customer size, and key differentiator. Call this whenever you need to recommend or analyse what a company sells.")]
    public string GetCompanyServices(
        [Description("The stable companyId from the registry, e.g. 'finabeo' or 'brigade-electronics'.")]
        string companyId)
    {
        if (!_registry.TryGet(companyId, out var company) || company is null)
            return JsonSerializer.Serialize(new { error = $"Unknown companyId '{companyId}'" });

        return JsonSerializer.Serialize(company.Services, JsonOptions);
    }

    [Description("Returns the list of industries / sectors the company primarily targets. Use this when you need to scope research or content to the right audience.")]
    public string GetCompanyTargetIndustries(
        [Description("The stable companyId, e.g. 'finabeo' or 'brigade-electronics'.")]
        string companyId)
    {
        if (!_registry.TryGet(companyId, out var company) || company is null)
            return JsonSerializer.Serialize(new { error = $"Unknown companyId '{companyId}'" });

        return JsonSerializer.Serialize(company.TargetIndustries);
    }

    [Description("Returns the brand voice / tone guidance for a company — how their content should sound. Use this to match content style to the company.")]
    public string GetCompanyVoice(
        [Description("The stable companyId, e.g. 'finabeo' or 'brigade-electronics'.")]
        string companyId)
    {
        if (!_registry.TryGet(companyId, out var company) || company is null)
            return JsonSerializer.Serialize(new { error = $"Unknown companyId '{companyId}'" });

        return JsonSerializer.Serialize(new
        {
            voice = company.Voice,
            description = company.Description
        });
    }

    [Description("Lists all companies known to the registry. Useful for diagnostic queries or when the agent needs to confirm a companyId is valid.")]
    public string ListAvailableCompanies()
    {
        var companies = _registry.All
            .Select(c => new { id = c.Id, name = c.Name, description = c.Description })
            .ToList();
        return JsonSerializer.Serialize(companies, JsonOptions);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
}
