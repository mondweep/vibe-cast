namespace FinabeoMarketingAgent.Config;

/// <summary>
/// A company that the marketing workflow can generate content for.
/// Each company brings its own service catalog, target industries, and branding.
/// </summary>
public class Company
{
    /// <summary>Stable identifier — used in URLs, blob paths, and tool calls (e.g. "finabeo", "brigade-electronics").</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Human-readable display name (e.g. "Finabeo", "Brigade Electronics").</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>One-line description of what the company does — used in agent system prompts.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Industries / sectors the company primarily targets — used to anchor the Research agent.</summary>
    public List<string> TargetIndustries { get; set; } = new();

    /// <summary>Brand voice / tone guidance — informs the Content agent's writing style.</summary>
    public string Voice { get; set; } = "professional, authoritative, and approachable";

    /// <summary>Filename of the branding JSON within the branding/ folder (e.g. "finabeo-branding.json").</summary>
    public string BrandingFile { get; set; } = string.Empty;

    /// <summary>The company's service catalog — what they sell.</summary>
    public List<CompanyService> Services { get; set; } = new();
}

/// <summary>
/// A single offering within a company's service catalog.
/// Replaces the old Finabeo-specific FinabeoService model.
/// </summary>
public class CompanyService
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Benefits { get; set; } = new();
    public List<string> TargetIndustries { get; set; } = new();
    public string TargetCustomerSize { get; set; } = string.Empty;
    public string KeyDifferentiator { get; set; } = string.Empty;
}
