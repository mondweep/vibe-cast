using System.Text.Json;

namespace FinabeoMarketingAgent.Branding;

/// <summary>
/// Typed view over a company's branding JSON file (e.g. finabeo-branding.json,
/// brigade-electronics-branding.json). Replaces the previous Dictionary&lt;string, object&gt;
/// approach in the formatters so colours, fonts, and brand strings are accessed via
/// strongly-typed properties instead of hardcoded values scattered through OpenXML code.
///
/// All hex colours are stripped of the leading '#' so they can be passed straight to OpenXML
/// (which expects 6-char hex without a hash). Missing keys fall back to sensible defaults
/// rather than throwing — this lets new companies be added before their full brand kit lands.
/// </summary>
public class BrandingTheme
{
    // ─── Identity ───
    public string CompanyName { get; init; } = "Company";
    public string Tagline { get; init; } = "";

    /// <summary>Used as the page header word-mark, e.g. "FINABEO" or "BRIGADE ELECTRONICS".</summary>
    public string BrandUppercase => CompanyName.ToUpperInvariant();

    /// <summary>Footer line, e.g. "© 2026 Finabeo. Enterprise FinOps & Agentic AI Partner".</summary>
    public string FooterText => string.IsNullOrEmpty(Tagline)
        ? $"© {DateTime.UtcNow.Year} {CompanyName}"
        : $"© {DateTime.UtcNow.Year} {CompanyName}. {Tagline}";

    // ─── Colours (6-char hex, no leading #) ───
    public string PrimaryHex { get; init; } = "003366";
    public string SecondaryHex { get; init; } = "00B4D8";
    public string AccentHex { get; init; } = "FFB81C";
    public string DarkHex { get; init; } = "2B2B2B";
    public string LightHex { get; init; } = "F5F5F5";
    public string MutedHex { get; init; } = "666666";

    // ─── Typography ───
    public string HeadingFont { get; init; } = "Montserrat";
    public string BodyFont { get; init; } = "Open Sans";

    // ─── PowerPoint-specific overrides ───
    // The default mapping (title slide = primary background + white text) works fine
    // for dark-primary brands (Finabeo navy). For light-primary brands (Brigade yellow),
    // the JSON should override these so white text on yellow doesn't happen.
    public string PptTitleSlideBackgroundHex { get; init; } = "003366";
    public string PptTitleSlideTextHex { get; init; } = "FFFFFF";
    public string PptHeadingColorHex { get; init; } = "003366";
    public string PptBodyColorHex { get; init; } = "2B2B2B";

    /// <summary>Slug used in temp filenames so different companies' temp files don't collide.</summary>
    public string FilenameSlug => CompanyName
        .ToLowerInvariant()
        .Replace(' ', '-')
        .Replace("&", "and");

    /// <summary>
    /// Load and parse a branding JSON file. Tolerant of missing fields — anything
    /// not present in the JSON falls back to the property defaults above.
    /// </summary>
    public static BrandingTheme LoadFromFile(string path)
    {
        if (!File.Exists(path))
            return new BrandingTheme(); // all defaults — Finabeo-ish fallback

        var json = File.ReadAllText(path);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        return new BrandingTheme
        {
            CompanyName = ReadString(root, "company", "name") ?? "Company",
            Tagline = ReadString(root, "company", "tagline") ?? "",
            PrimaryHex = NormaliseHex(ReadString(root, "colors", "primary", "hex")) ?? "003366",
            SecondaryHex = NormaliseHex(ReadString(root, "colors", "secondary", "hex")) ?? "00B4D8",
            AccentHex = NormaliseHex(ReadString(root, "colors", "accent", "hex")) ?? "FFB81C",
            DarkHex = NormaliseHex(ReadString(root, "colors", "neutral", "dark", "hex")) ?? "2B2B2B",
            LightHex = NormaliseHex(ReadString(root, "colors", "neutral", "light", "hex")) ?? "F5F5F5",
            MutedHex = NormaliseHex(ReadString(root, "colors", "neutral", "muted", "hex")) ?? "666666",
            HeadingFont = ReadString(root, "typography", "heading", "family") ?? "Montserrat",
            BodyFont = ReadString(root, "typography", "body", "family") ?? "Open Sans",
            PptTitleSlideBackgroundHex = NormaliseHex(ReadString(root, "templates", "document", "powerpoint", "title_slide_background"))
                ?? NormaliseHex(ReadString(root, "colors", "primary", "hex")) ?? "003366",
            PptTitleSlideTextHex = NormaliseHex(ReadString(root, "templates", "document", "powerpoint", "title_color")) ?? "FFFFFF",
            PptHeadingColorHex = NormaliseHex(ReadString(root, "templates", "document", "powerpoint", "heading_color"))
                ?? NormaliseHex(ReadString(root, "colors", "primary", "hex")) ?? "003366",
            PptBodyColorHex = NormaliseHex(ReadString(root, "templates", "document", "powerpoint", "body_color"))
                ?? NormaliseHex(ReadString(root, "colors", "neutral", "dark", "hex")) ?? "2B2B2B",
        };
    }

    /// <summary>
    /// Walk the JSON tree by key path. Returns null if any segment is missing
    /// or any intermediate node isn't an object. Last segment must be a string.
    /// </summary>
    private static string? ReadString(JsonElement root, params string[] path)
    {
        var current = root;
        foreach (var key in path)
        {
            if (current.ValueKind != JsonValueKind.Object) return null;
            if (!current.TryGetProperty(key, out var next)) return null;
            current = next;
        }
        return current.ValueKind == JsonValueKind.String ? current.GetString() : null;
    }

    /// <summary>Strip the leading '#' from a hex colour. OpenXML expects 6 chars only.</summary>
    private static string? NormaliseHex(string? hex)
    {
        if (string.IsNullOrWhiteSpace(hex)) return null;
        var trimmed = hex.Trim().TrimStart('#');
        return trimmed.Length == 6 ? trimmed.ToUpperInvariant() : null;
    }
}
