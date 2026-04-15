using System.Text.Json;
using System.Text.Json.Serialization;

namespace FinabeoMarketingAgent.Config;

/// <summary>
/// Registry of all companies the marketing workflow knows about.
/// Loaded once at startup from a JSON file (or embedded fallback).
/// Look up a company by its stable Id.
/// </summary>
public class CompanyRegistry
{
    private readonly Dictionary<string, Company> _companiesById;

    public CompanyRegistry(IEnumerable<Company> companies)
    {
        _companiesById = companies.ToDictionary(c => c.Id, StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyCollection<Company> All => _companiesById.Values;

    /// <summary>Look up a company by Id. Throws if not found — caller should validate first.</summary>
    public Company Get(string companyId)
    {
        if (!_companiesById.TryGetValue(companyId, out var company))
        {
            throw new KeyNotFoundException(
                $"Unknown company id: '{companyId}'. Known companies: {string.Join(", ", _companiesById.Keys)}");
        }
        return company;
    }

    public bool TryGet(string companyId, out Company? company) =>
        _companiesById.TryGetValue(companyId, out company);

    /// <summary>
    /// Load companies from a JSON file. Returns a registry ready to use.
    /// File format: { "companies": [ { Id, Name, Description, ... }, ... ] }
    /// </summary>
    public static CompanyRegistry LoadFromFile(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException($"Companies config not found at: {path}");

        var json = File.ReadAllText(path);
        var doc = JsonSerializer.Deserialize<CompaniesDocument>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Companies config is empty or invalid: {path}");

        return new CompanyRegistry(doc.Companies);
    }

    /// <summary>
    /// Try to find the companies.json file by walking up from common base directories.
    /// Used by API/console hosts that may run from different working dirs in dev vs prod.
    /// </summary>
    public static string ResolveDefaultConfigPath()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "companies.json"),
            Path.Combine(AppContext.BaseDirectory, "branding", "companies.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "branding", "companies.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "..", "branding", "companies.json"),
        };

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
                return Path.GetFullPath(candidate);
        }

        throw new FileNotFoundException(
            "companies.json not found. Searched: " + string.Join(", ", candidates));
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    private record CompaniesDocument([property: JsonPropertyName("companies")] List<Company> Companies);
}
