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
/// Application configuration root.
/// Note: per-company service catalogs now live in branding/companies.json and are loaded
/// via <see cref="CompanyRegistry"/>. This class only holds Foundry connection config.
/// </summary>
public class AppConfig
{
    public FoundryConfig Foundry { get; set; } = new();
}
