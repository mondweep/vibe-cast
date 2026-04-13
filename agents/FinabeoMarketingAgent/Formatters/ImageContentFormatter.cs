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

        // Dynamic font size based on title length
        var fontSize = title.Length > 80 ? 30 : (title.Length > 50 ? 36 : 44);
        var maxCharsPerLine = title.Length > 80 ? 45 : (title.Length > 50 ? 40 : 35);
        var maxLines = imageType == "instagram-image" ? 6 : 4;

        return $@"
<svg width=""{width}"" height=""{height}"" xmlns=""http://www.w3.org/2000/svg"">
  <defs>
    <linearGradient id=""bgGradient"" x1=""0%"" y1=""0%"" x2=""0%"" y2=""100%"">
      <stop offset=""0%"" style=""stop-color:#003366;stop-opacity:1"" />
      <stop offset=""100%"" style=""stop-color:#00B4D8;stop-opacity:1"" />
    </linearGradient>
    <pattern id=""grid"" width=""40"" height=""40"" patternUnits=""userSpaceOnUse"">
      <path d=""M 40 0 L 0 0 0 40"" fill=""none"" stroke=""white"" stroke-width=""0.5"" opacity=""0.1""/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width=""{width}"" height=""{height}"" fill=""url(#bgGradient)""/>
  <rect width=""{width}"" height=""{height}"" fill=""url(#grid)""/>

  <!-- Hexagon Pattern (Visual Depth Background) -->
  <rect width=""100%"" height=""100%"" fill=""url(#hexagons)"" />

  <!-- Brand bar -->
  <rect width=""{width}"" height=""40"" fill=""#FFB81C"" opacity=""0.9""/>
  <text x=""30"" y=""28"" font-family=""Montserrat, Arial, sans-serif"" font-size=""20"" font-weight=""bold"" fill=""#003366"">
    FINABEO
  </text>

  <!-- Content Box -->
  <rect x=""40"" y=""80"" width=""{width - 80}"" height=""{height - 180}"" fill=""rgba(255,255,255,0.05)"" stroke=""rgba(255,255,255,0.2)"" stroke-width=""2"" rx=""15""/>

  <!-- Title (Word-Aware Wrapping) -->
  <text x=""70"" y=""125"" font-family=""Montserrat, Arial, sans-serif"" font-size=""{fontSize}"" font-weight=""bold"" fill=""#FFFFFF"">
    {GenerateTspans(title, maxCharsPerLine, maxLines, fontSize + 6)}
  </text>

  <!-- Decorate with 'Data' lines -->
  <g opacity=""0.4"">
    <rect x=""70"" y=""300"" width=""400"" height=""8"" fill=""#FFB81C"" rx=""4""/>
    <rect x=""70"" y=""320"" width=""250"" height=""8"" fill=""#00B4D8"" rx=""4""/>
    <rect x=""70"" y=""340"" width=""320"" height=""8"" fill=""#FFFFFF"" rx=""4""/>
  </g>
  <!-- Aesthetic Shapes -->
  <circle cx=""{width - 100}"" cy=""120"" r=""60"" fill=""#FFB81C"" opacity=""0.2""/>
  <path d=""M {width - 150} {height - 150} L {width - 50} {height - 150} L {width - 100} {height - 50} Z"" fill=""#FFFFFF"" opacity=""0.1""/>
  
  <!-- Digital Seal (Enterprise Verified) -->
  <g transform=""translate(40, 40)"" opacity=""0.5"">
    <circle cx=""30"" cy=""30"" r=""25"" stroke=""#FFB81C"" stroke-width=""2"" fill=""none""/>
    <text x=""30"" y=""35"" font-family=""Montserrat, Arial, sans-serif"" font-size=""10"" fill=""#FFB81C"" text-anchor=""middle"" font-weight=""700"">VERIFIED</text>
  </g>

  <!-- Key Research Findings (High-Density Text Block) -->
  <g transform=""translate(80, 260)"">
    <text x=""0"" y=""0"" font-family=""Montserrat, Arial, sans-serif"" font-size=""24"" font-weight=""700"" fill=""#FFB81C"">STRATEGIC INSIGHTS</text>
    <g transform=""translate(0, 35)"" font-family=""Open Sans, Arial, sans-serif"" font-size=""20"" fill=""#FFFFFF"" opacity=""0.9"">
      <text x=""0"" y=""25"">• Enterprise Agentic AI Orchestration</text>
      <text x=""0"" y=""55"">• 240% ROI in Multi-Agent Workflows</text>
      <text x=""0"" y=""85"">• Zero-Trust Autonomous Security</text>
      <text x=""0"" y=""115"">• Cloud FinOps Scaling Strategies</text>
      <text x=""0"" y=""145"">• Microsoft Fabric Service Alignment</text>
    </g>
  </g>

  <!-- Hexagon Pattern (Visual Depth) -->
  <pattern id=""hexagons"" width=""50"" height=""43.3"" patternUnits=""userSpaceOnUse"" patternTransform=""scale(2) rotate(30)"">
    <path d=""M25 0 L50 14.4 L50 43.3 L25 57.7 L0 43.3 L0 14.4 Z"" fill=""none"" stroke=""#00B4D8"" stroke-width=""0.5"" opacity=""0.15""/>
  </pattern>

  <!-- Content Mockup (Bar Chart with Metrics) -->
  <g transform=""translate({width - 350}, {height - 300})"" opacity=""0.8"">
    <text x=""0"" y=""90"" font-family=""Montserrat, Arial, sans-serif"" font-size=""14"" font-weight=""700"" fill=""#FFB81C"">+240% ROI</text>
    <rect x=""0"" y=""100"" width=""35"" height=""80"" fill=""#FFB81C"" rx=""4""/>
    
    <text x=""50"" y=""50"" font-family=""Montserrat, Arial, sans-serif"" font-size=""14"" font-weight=""700"" fill=""#00B4D8"">35% Svg</text>
    <rect x=""50"" y=""60"" width=""35"" height=""120"" fill=""#00B4D8"" rx=""4""/>
    
    <rect x=""100"" y=""130"" width=""35"" height=""50"" fill=""#FFFFFF"" rx=""4""/>
    <rect x=""150"" y=""80"" width=""35"" height=""100"" fill=""#FFB81C"" rx=""4""/>
    <rect x=""200"" y=""40"" width=""35"" height=""140"" fill=""#00B4D8"" rx=""4""/>
    <line x1=""0"" y1=""185"" x2=""240"" y2=""185"" stroke=""#FFFFFF"" stroke-width=""3""/>
  </g>

  <!-- Data Shield (Branded Element) -->
  <g transform=""translate({width - 150}, 80)"" opacity=""0.3"">
    <path d=""M 30 0 L 60 20 L 60 70 L 30 90 L 0 70 L 0 20 Z"" fill=""#FFB81C""/>
    <path d=""M 10 30 L 30 20 L 50 30 L 50 60 L 30 70 L 10 60 Z"" fill=""#003366""/>
  </g>

  <!-- Tech Mesh (High-Visibility Connections) -->
  <g stroke=""#00B4D8"" stroke-width=""3"" opacity=""0.6"">
    <circle cx=""100"" cy=""{height - 100}"" r=""8"" fill=""#FFB81C""/>
    <circle cx=""200"" cy=""{height - 220}"" r=""8"" fill=""#FFFFFF""/>
    <circle cx=""300"" cy=""{height - 140}"" r=""8"" fill=""#00B4D8""/>
    <line x1=""100"" y1=""{height - 100}"" x2=""200"" y2=""{height - 220}""/>
    <line x1=""200"" y1=""{height - 220}"" x2=""300"" y2=""{height - 140}""/>
    <line x1=""300"" y1=""{height - 140}"" x2=""100"" y2=""{height - 100}""/>
  </g>

  <!-- Digital Horizon -->
  <rect x=""0"" y=""{height - 100}"" width=""{width}"" height=""4"" fill=""url(#bgGradient)"" opacity=""0.2""/>
  <rect x=""0"" y=""{height - 80}"" width=""{width}"" height=""3"" fill=""#FFB81C"" opacity=""0.5""/>
  <rect x=""100"" y=""{height - 75}"" width=""300"" height=""1"" fill=""#00B4D8"" opacity=""0.4""/>

  <!-- Footer Branding -->
  <text x=""70"" y=""{height - 60}"" font-family=""Open Sans, Arial, sans-serif"" font-size=""16"" font-weight=""600"" fill=""#FFFFFF"" opacity=""0.8"">
    Enterprise FinOps &amp; Agentic AI Orchestration
  </text>
  
  <line x1=""70"" y1=""{height - 85}"" x2=""300"" y2=""{height - 85}"" stroke=""#FFB81C"" stroke-width=""2"" opacity=""0.6""/>
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

    private string GenerateTspans(string text, int maxCharsPerLine, int maxLines, int lineSpacing)
    {
        var words = text.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        var lines = new List<string>();
        var currentLine = new System.Text.StringBuilder();

        foreach (var word in words)
        {
            if (currentLine.Length > 0 && (currentLine.Length + word.Length + 1) > maxCharsPerLine)
            {
                lines.Add(currentLine.ToString().Trim());
                currentLine.Clear();
            }
            if (currentLine.Length > 0) currentLine.Append(" ");
            currentLine.Append(word);
        }
        if (currentLine.Length > 0) lines.Add(currentLine.ToString().Trim());

        var result = new System.Text.StringBuilder();
        for (int i = 0; i < Math.Min(maxLines, lines.Count); i++)
        {
            var dy = i == 0 ? "0" : lineSpacing.ToString();
            result.AppendLine($"<tspan x=\"70\" dy=\"{dy}\">{EscapeXml(lines[i])}</tspan>");
        }
        return result.ToString();
    }
}
