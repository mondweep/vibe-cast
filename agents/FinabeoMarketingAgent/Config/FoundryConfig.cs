namespace FinabeoMarketingAgent.Config;

/// <summary>
/// Configuration for Azure AI Foundry
/// </summary>
public class FoundryConfig
{
    public string Endpoint { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;

    public bool IsValid => !string.IsNullOrEmpty(Endpoint) && !string.IsNullOrEmpty(ApiKey);
}

/// <summary>
/// Finabeo service definition
/// </summary>
public class FinabeoService
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Benefits { get; set; } = new();
    public List<string> TargetIndustries { get; set; } = new();
    public string TargetCustomerSize { get; set; } = string.Empty;
    public string KeyDifferentiator { get; set; } = string.Empty;
}

/// <summary>
/// Application configuration root
/// </summary>
public class AppConfig
{
    public FoundryConfig Foundry { get; set; } = new();
    public List<FinabeoService> FinabeoServices { get; set; } = new();
}
