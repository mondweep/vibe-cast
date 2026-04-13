using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FinabeoMarketingAgent.Models;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Formatters;

/// <summary>
/// Generates branded Word documents from marketing content
/// </summary>
public class WordContentFormatter
{
    private readonly string _brandingConfigPath;
    private readonly ILogger<WordContentFormatter> _logger;
    private Dictionary<string, object>? _brandingConfig;

    public WordContentFormatter(string brandingConfigPath, ILogger<WordContentFormatter> logger)
    {
        _brandingConfigPath = brandingConfigPath;
        _logger = logger;
        LoadBrandingConfig();
    }

    private void LoadBrandingConfig()
    {
        try
        {
            var json = File.ReadAllText(_brandingConfigPath);
            _brandingConfig = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            _logger.LogInformation("✓ Branding configuration loaded");
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"⚠ Could not load branding config: {ex.Message}. Using defaults.");
            _brandingConfig = GetDefaultBrandingConfig();
        }
    }

    /// <summary>
    /// Generate a branded Word document with blog content
    /// </summary>
    public async Task<string> GenerateBlogDocumentAsync(WorkflowResult workflowResult)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
        var fileName = $"output/finabeo-blog-{timestamp}.docx";

        try
        {
            using (var doc = WordprocessingDocument.Create(fileName, WordprocessingDocumentType.Document))
            {
                var mainPart = doc.AddMainDocumentPart();
                mainPart.Document = new Document();

                var body = mainPart.Document.Body ?? new Body();
                mainPart.Document.Body = body;

                // Add header
                AddHeader(body);

                // Add title
                AddParagraph(body, workflowResult.GeneratedContent?.Content?.Blog?.Title ?? "Blog Post",
                    fontSize: "36", color: "003366", isBold: true);

                // Add meta description
                AddParagraph(body, workflowResult.GeneratedContent?.Content?.Blog?.MetaDescription ?? "",
                    fontSize: "12", color: "666666", isItalic: true);

                // Add market insights section
                AddMarketInsightsSection(body, workflowResult.MarketAnalysis);

                // Add service alignment section
                AddServiceAlignmentSection(body, workflowResult.ServiceAlignment);

                // Add blog content
                if (workflowResult.GeneratedContent?.Content?.Blog?.DraftContent != null)
                {
                    AddBlogContentSection(body, workflowResult.GeneratedContent.Content.Blog.DraftContent);
                }

                // Add SEO keywords section
                if (workflowResult.GeneratedContent?.Content?.Blog?.SeoKeywords != null)
                {
                    AddSeoSection(body, workflowResult.GeneratedContent.Content.Blog.SeoKeywords);
                }

                // Add footer
                AddFooter(body);

                mainPart.Document.Save();
                _logger.LogInformation($"✓ Word document created: {fileName}");
            }

            return fileName;
        }
        catch (Exception ex)
        {
            _logger.LogError($"✗ Error generating Word document: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Generate a branded Word document with market analysis report
    /// </summary>
    public async Task<string> GenerateMarketAnalysisReportAsync(WorkflowResult workflowResult)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
        var fileName = $"output/finabeo-market-analysis-{timestamp}.docx";

        try
        {
            using (var doc = WordprocessingDocument.Create(fileName, WordprocessingDocumentType.Document))
            {
                var mainPart = doc.AddMainDocumentPart();
                mainPart.Document = new Document();

                var body = mainPart.Document.Body ?? new Body();
                mainPart.Document.Body = body;

                // Add header
                AddHeader(body);

                // Add title
                AddParagraph(body, "Enterprise Market Analysis Report",
                    fontSize: "36", color: "003366", isBold: true);
                AddParagraph(body, $"Generated: {DateTime.UtcNow:MMMM dd, yyyy}",
                    fontSize: "12", color: "666666");

                // Add executive summary
                AddSectionHeading(body, "Executive Summary");
                AddParagraph(body, workflowResult.MarketAnalysis?.Summary ?? "");

                // Add market insights
                AddMarketInsightsSection(body, workflowResult.MarketAnalysis);

                // Add trends
                if (workflowResult.MarketAnalysis?.Trends != null)
                {
                    AddSectionHeading(body, "Key Trends");
                    foreach (var trend in workflowResult.MarketAnalysis.Trends)
                    {
                        AddBulletPoint(body, trend);
                    }
                }

                // Add pain points
                if (workflowResult.MarketAnalysis?.PainPoints != null)
                {
                    AddSectionHeading(body, "Enterprise Pain Points");
                    foreach (var pain in workflowResult.MarketAnalysis.PainPoints)
                    {
                        AddBulletPoint(body, pain);
                    }
                }

                // Add service alignment
                AddServiceAlignmentSection(body, workflowResult.ServiceAlignment);

                // Add footer
                AddFooter(body);

                mainPart.Document.Save();
                _logger.LogInformation($"✓ Market analysis report created: {fileName}");
            }

            return fileName;
        }
        catch (Exception ex)
        {
            _logger.LogError($"✗ Error generating market analysis report: {ex.Message}");
            throw;
        }
    }

    private void AddHeader(Body body)
    {
        AddParagraph(body, "FINABEO", fontSize: "24", color: "003366", isBold: true);
        AddParagraph(body, "Enterprise FinOps & Agentic AI Partner", fontSize: "12", color: "00B4D8", isBold: true);
        AddParagraph(body, "");
    }

    private void AddMarketInsightsSection(Body body, MarketAnalysis? analysis)
    {
        if (analysis?.MarketInsights == null || !analysis.MarketInsights.Any())
            return;

        AddSectionHeading(body, "Market Insights");

        foreach (var insight in analysis.MarketInsights)
        {
            AddSubsectionHeading(body, insight.Trend ?? "");
            AddParagraph(body, $"Pain Point: {insight.PainPoint ?? ""}");
            AddParagraph(body, $"Market Segment: {insight.MarketSegment ?? ""}");
            AddParagraph(body, $"Opportunity: {insight.OpportunityDescription ?? ""}");
            AddParagraph(body, "");
        }
    }

    private void AddServiceAlignmentSection(Body body, ServiceAlignment? alignment)
    {
        if (alignment?.FinabeoServices == null || !alignment.FinabeoServices.Any())
            return;

        AddSectionHeading(body, "Service Alignment");
        AddParagraph(body, alignment.Summary ?? "");
        AddParagraph(body, "");

        foreach (var service in alignment.FinabeoServices)
        {
            AddCalloutBox(body, $"{service.ServiceName} - {(service.AlignmentScore * 100):F0}% Fit",
                $"{service.WhyFit}\n\nKey Benefits:\n• {string.Join("\n• ", service.KeyBenefitsToHighlight ?? new List<string>())}");
        }

        if (!string.IsNullOrEmpty(alignment.RecommendedFocus))
        {
            AddParagraph(body, "");
            AddCalloutBox(body, "Recommended Focus", alignment.RecommendedFocus, isHighlight: true);
        }
    }

    private void AddBlogContentSection(Body body, string content)
    {
        AddSectionHeading(body, "Full Article");

        // Parse markdown-style content
        var lines = content.Split('\n');
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                AddParagraph(body, "");
            }
            else if (line.StartsWith("# "))
            {
                AddParagraph(body, line.Substring(2), fontSize: "28", color: "003366", isBold: true);
            }
            else if (line.StartsWith("## "))
            {
                AddParagraph(body, line.Substring(3), fontSize: "20", color: "00B4D8", isBold: true);
            }
            else if (line.StartsWith("- "))
            {
                AddBulletPoint(body, line.Substring(2));
            }
            else
            {
                AddParagraph(body, line);
            }
        }
    }

    private void AddSeoSection(Body body, List<string> keywords)
    {
        AddSectionHeading(body, "SEO Keywords");
        AddParagraph(body, string.Join(" • ", keywords), fontSize: "11", color: "666666", isItalic: true);
    }

    private void AddSectionHeading(Body body, string text)
    {
        AddParagraph(body, text, fontSize: "20", color: "003366", isBold: true);
    }

    private void AddSubsectionHeading(Body body, string text)
    {
        AddParagraph(body, text, fontSize: "16", color: "00B4D8", isBold: true);
    }

    private void AddParagraph(Body body, string text, string fontSize = "11",
        string color = "2B2B2B", bool isBold = false, bool isItalic = false)
    {
        var paragraph = new Paragraph();
        var run = new Run();
        var runProperties = new RunProperties();

        if (isBold)
            runProperties.Append(new Bold());

        if (isItalic)
            runProperties.Append(new Italic());

        runProperties.Append(new FontSize { Val = fontSize + "pt" });
        runProperties.Append(new Color { Val = color });

        run.Append(runProperties);
        run.Append(new Text { Text = text });
        paragraph.Append(run);

        body.Append(paragraph);
    }

    private void AddBulletPoint(Body body, string text)
    {
        var paragraph = new Paragraph();
        var pPr = new ParagraphProperties();
        var pStyle = new ParagraphStyleId { Val = "ListBullet" };
        pPr.Append(pStyle);

        var run = new Run();
        var runProperties = new RunProperties();
        runProperties.Append(new FontSize { Val = "22" });
        runProperties.Append(new Color { Val = "2B2B2B" });

        run.Append(runProperties);
        run.Append(new Text { Text = text });

        paragraph.Append(pPr);
        paragraph.Append(run);
        body.Append(paragraph);
    }

    private void AddCalloutBox(Body body, string title, string content, bool isHighlight = false)
    {
        var borderColor = isHighlight ? "FFB81C" : "00B4D8";

        AddParagraph(body, title, fontSize: "14", color: borderColor, isBold: true);
        AddParagraph(body, content, fontSize: "11", color: "2B2B2B");
        AddParagraph(body, "");
    }

    private void AddFooter(Body body)
    {
        var paragraph = new Paragraph(new ParagraphProperties(new ParagraphBorders
        {
            TopBorder = new TopBorder { Val = BorderValues.Single, Color = "003366", Size = 12 }
        }));
        body.Append(paragraph);

        AddParagraph(body, "© 2026 Finabeo. Enterprise FinOps & Agentic AI Partner",
            fontSize: "10", color: "666666", isItalic: true);
    }

    private Dictionary<string, object> GetDefaultBrandingConfig()
    {
        return new Dictionary<string, object>
        {
            { "colors", new { primary = "#003366", secondary = "#00B4D8", accent = "#FFB81C" } }
        };
    }
}
