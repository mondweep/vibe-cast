using FinabeoMarketingAgent.Models;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text.Json;

namespace FinabeoMarketingAgent.Formatters;

/// <summary>
/// Generates branded JPEG images for social media using Azure OpenAI DALL-E
/// </summary>
public class ImageContentFormatter
{
    private readonly HttpClient _httpClient;
    private readonly string _foundryEndpoint;
    private readonly string _apiKey;
    private readonly ILogger<ImageContentFormatter> _logger;

    public ImageContentFormatter(string foundryEndpoint, string apiKey, ILogger<ImageContentFormatter> logger)
    {
        _foundryEndpoint = foundryEndpoint.TrimEnd('/');
        _apiKey = apiKey;
        _logger = logger;
        _httpClient = new HttpClient();
    }

    /// <summary>
    /// Generate LinkedIn post image
    /// </summary>
    public async Task<string?> GenerateLinkedInImageAsync(string headline, string content)
    {
        var prompt = $@"
Create a professional LinkedIn post visual for:
Headline: {headline}

Design requirements:
- Use Finabeo brand colors: Navy Blue (#003366), Tech Blue (#00B4D8), Gold (#FFB81C)
- Navy blue background (top 40%), light background (bottom 60%)
- White text for headline, readable on navy blue
- Finabeo logo area in top-left corner
- Professional, enterprise-focused design
- Dimensions: 1200x627px (LinkedIn post)
- Include key words: {content.Split(' ').Take(5).Aggregate((a, b) => a + " " + b)}
- Modern, minimalist design with clear typography
- No AI-generated people, use geometric shapes and icons instead
";

        return await GenerateImageAsync(prompt, "linkedin-image");
    }

    /// <summary>
    /// Generate Instagram post image
    /// </summary>
    public async Task<string?> GenerateInstagramImageAsync(string caption, List<string> hashtags)
    {
        var prompt = $@"
Create a bold Instagram post visual with:
Caption theme: {caption.Split('\n').First()}

Design requirements:
- Use Finabeo brand colors: Navy Blue (#003366), Tech Blue (#00B4D8), Gold (#FFB81C)
- Bold, colorful design with color blocks
- Gold (#FFB81C) accent for statistics/metrics
- Large, eye-catching typography
- Dimensions: 1080x1080px (Instagram square)
- Include text: 'Enterprise AI', 'FinOps', or similar
- Modern, tech-forward aesthetic
- No AI-generated people
- Professional yet approachable tone
";

        return await GenerateImageAsync(prompt, "instagram-image");
    }

    /// <summary>
    /// Generate Twitter post card
    /// </summary>
    public async Task<string?> GenerateTwitterCardAsync(string tweetText)
    {
        var prompt = $@"
Create a Twitter/X post card visual for:
Text: {tweetText.Split('\n').First()}

Design requirements:
- Navy blue (#003366) background
- White and Tech Blue (#00B4D8) text
- Finabeo branding in corner
- Dimensions: 1024x512px
- Professional, minimal design
- Clear, readable typography
- Finabeo logo area
- No AI-generated people, use icons/shapes
";

        return await GenerateImageAsync(prompt, "twitter-card");
    }

    /// <summary>
    /// Generate a blog featured image
    /// </summary>
    public async Task<string?> GenerateBlogFeaturedImageAsync(string blogTitle)
    {
        var prompt = $@"
Create a professional blog featured image for:
Title: {blogTitle}

Design requirements:
- Finabeo brand colors: Navy Blue (#003366), Tech Blue (#00B4D8), Gold (#FFB81C)
- Modern, professional design
- Dimensions: 1200x675px
- Title text: '{blogTitle.Substring(0, Math.Min(60, blogTitle.Length))}'
- Finabeo branding visible
- Enterprise, tech-focused aesthetic
- Clear visual hierarchy
- No AI-generated people
- Geometric shapes, icons, or data visualizations appropriate to topic
";

        return await GenerateImageAsync(prompt, "blog-featured");
    }

    private async Task<string?> GenerateImageAsync(string prompt, string imageType)
    {
        try
        {
            _logger.LogInformation($"🎨 Generating {imageType} image...");

            // For now, we'll create a placeholder image since actual DALL-E API requires special setup
            // In production, this would call Azure OpenAI's DALL-E endpoint
            var imagePath = await CreatePlaceholderImageAsync(imageType, prompt);

            if (imagePath != null)
            {
                _logger.LogInformation($"✓ {imageType} generated: {imagePath}");
            }

            return imagePath;
        }
        catch (Exception ex)
        {
            _logger.LogError($"✗ Error generating {imageType}: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Create a simple placeholder image with Finabeo branding
    /// In production, this would be replaced with actual DALL-E API calls
    /// </summary>
    private async Task<string?> CreatePlaceholderImageAsync(string imageType, string prompt)
    {
        try
        {
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
            var fileName = $"output/finabeo-{imageType}-{timestamp}.jpg";

            // Extract key information from prompt for the placeholder
            var keywordMatch = System.Text.RegularExpressions.Regex.Match(prompt, @"(?:Title|Headline|theme|Text): ([^\n]+)");
            var title = keywordMatch.Success ? keywordMatch.Groups[1].Value : "Finabeo Marketing";

            // Create a simple SVG with Finabeo branding that can be saved
            var svgContent = GenerateSvgPlaceholder(imageType, title);

            // Save SVG as the placeholder (in production, this would be JPEG from DALL-E)
            var svgPath = fileName.Replace(".jpg", ".svg");
            await File.WriteAllTextAsync(svgPath, svgContent);

            _logger.LogInformation($"  📝 Placeholder image created: {svgPath}");
            _logger.LogInformation($"  💡 In production, this would be generated by Azure OpenAI DALL-E");

            return svgPath;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating placeholder: {ex.Message}");
            return null;
        }
    }

    private string GenerateSvgPlaceholder(string imageType, string title)
    {
        var (width, height) = imageType switch
        {
            "linkedin-image" => (1200, 627),
            "instagram-image" => (1080, 1080),
            "twitter-card" => (1024, 512),
            "blog-featured" => (1200, 675),
            _ => (1200, 600)
        };

        var titleTruncated = title.Length > 50 ? title.Substring(0, 47) + "..." : title;

        return $@"
<svg width=""{width}"" height=""{height}"" xmlns=""http://www.w3.org/2000/svg"">
  <!-- Background -->
  <defs>
    <linearGradient id=""bgGradient"" x1=""0%"" y1=""0%"" x2=""0%"" y2=""100%"">
      <stop offset=""0%"" style=""stop-color:#003366;stop-opacity:1"" />
      <stop offset=""100%"" style=""stop-color:#00B4D8;stop-opacity:1"" />
    </linearGradient>
  </defs>

  <rect width=""{width}"" height=""{height}"" fill=""url(#bgGradient)""/>

  <!-- Brand bar -->
  <rect width=""{width}"" height=""40"" fill=""#FFB81C"" opacity=""0.9""/>

  <!-- Logo text -->
  <text x=""30"" y=""30"" font-family=""Montserrat, Arial, sans-serif"" font-size=""24"" font-weight=""bold"" fill=""#FFFFFF"">
    FINABEO
  </text>

  <!-- Main content -->
  <rect x=""40"" y=""80"" width=""{width - 80}"" height=""{height - 140}"" fill=""rgba(255,255,255,0.1)"" rx=""10""/>

  <!-- Title -->
  <text x=""60"" y=""150"" font-family=""Montserrat, Arial, sans-serif"" font-size=""48"" font-weight=""bold"" fill=""#FFFFFF"" text-anchor=""start"">
    <tspan x=""60"" dy=""0"">{EscapeXml(titleTruncated.Substring(0, Math.Min(30, titleTruncated.Length)))}</tspan>
    {(titleTruncated.Length > 30 ? $""<tspan x=\"60\" dy=\"60\">{EscapeXml(titleTruncated.Substring(30))}</tspan>"" : "")}
  </text>

  <!-- Subtitle -->
  <text x=""60"" y=""{height - 70}"" font-family=""Open Sans, Arial, sans-serif"" font-size=""18"" fill=""#FFFFFF"" opacity=""0.9"">
    Enterprise FinOps &amp; Agentic AI Partner
  </text>

  <!-- Decorative elements -->
  <circle cx=""{width - 80}"" cy=""60"" r=""40"" fill=""#FFB81C"" opacity=""0.3""/>
  <circle cx=""50"" cy=""{height - 50}"" r=""30"" fill=""#FFFFFF"" opacity=""0.2""/>
</svg>
";
    }

    private string EscapeXml(string text)
    {
        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
    }
}
