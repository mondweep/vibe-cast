using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FinabeoMarketingAgent.Branding;
using FinabeoMarketingAgent.Models;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Formatters;

/// <summary>
/// Generates branded Word documents from marketing content.
/// All colours, fonts, and brand strings are pulled from <see cref="BrandingTheme"/> —
/// pass the path to a company's branding JSON (e.g. finabeo-branding.json,
/// brigade-electronics-branding.json) to get correctly themed output.
/// </summary>
public class WordContentFormatter
{
    private readonly BrandingTheme _theme;
    private readonly ILogger<WordContentFormatter> _logger;

    public WordContentFormatter(string brandingConfigPath, ILogger<WordContentFormatter> logger)
    {
        _logger = logger;
        try
        {
            _theme = BrandingTheme.LoadFromFile(brandingConfigPath);
            _logger.LogInformation("✓ Branding loaded for {Company} (primary {Primary}, accent {Accent})",
                _theme.CompanyName, _theme.PrimaryHex, _theme.AccentHex);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠ Could not load branding from {Path}; using defaults", brandingConfigPath);
            _theme = new BrandingTheme();
        }
    }

    public async Task<string> GenerateBlogDocumentAsync(WorkflowResult workflowResult)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
        var fileName = $"output/{_theme.FilenameSlug}-blog-{timestamp}.docx";

        Directory.CreateDirectory(Path.GetDirectoryName(fileName) ?? "output");

        try
        {
            using (var doc = WordprocessingDocument.Create(fileName, WordprocessingDocumentType.Document))
            {
                var mainPart = doc.AddMainDocumentPart();
                mainPart.Document = new Document();

                var body = mainPart.Document.Body ?? new Body();
                mainPart.Document.Body = body;

                AddHeader(body);

                AddParagraph(body, workflowResult.GeneratedContent?.Content?.Blog?.Title ?? "Blog Post",
                    fontSize: "36", color: _theme.PrimaryHex, isBold: true);

                AddParagraph(body, workflowResult.GeneratedContent?.Content?.Blog?.MetaDescription ?? "",
                    fontSize: "12", color: _theme.MutedHex, isItalic: true);

                AddMarketInsightsSection(body, workflowResult.MarketAnalysis);
                AddServiceAlignmentSection(body, workflowResult.ServiceAlignment);

                if (workflowResult.GeneratedContent?.Content?.Blog?.DraftContent != null)
                {
                    AddBlogContentSection(body, workflowResult.GeneratedContent.Content.Blog.DraftContent);
                }

                if (workflowResult.GeneratedContent?.Content?.Blog?.SeoKeywords != null)
                {
                    AddSeoSection(body, workflowResult.GeneratedContent.Content.Blog.SeoKeywords);
                }

                AddFooter(body);

                mainPart.Document.Save();
                _logger.LogInformation("✓ Word document created: {File}", fileName);
            }

            return fileName;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "✗ Error generating Word document");
            throw;
        }
    }

    public async Task<string> GenerateMarketAnalysisReportAsync(WorkflowResult workflowResult)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
        var fileName = $"output/{_theme.FilenameSlug}-market-analysis-{timestamp}.docx";

        Directory.CreateDirectory(Path.GetDirectoryName(fileName) ?? "output");

        try
        {
            using (var doc = WordprocessingDocument.Create(fileName, WordprocessingDocumentType.Document))
            {
                var mainPart = doc.AddMainDocumentPart();
                mainPart.Document = new Document();

                var body = mainPart.Document.Body ?? new Body();
                mainPart.Document.Body = body;

                AddHeader(body);

                AddParagraph(body, "Enterprise Market Analysis Report",
                    fontSize: "36", color: _theme.PrimaryHex, isBold: true);
                AddParagraph(body, $"Generated: {DateTime.UtcNow:MMMM dd, yyyy}",
                    fontSize: "12", color: _theme.MutedHex);

                AddSectionHeading(body, "Executive Summary");
                AddParagraph(body, workflowResult.MarketAnalysis?.Summary ?? "");

                AddMarketInsightsSection(body, workflowResult.MarketAnalysis);

                if (workflowResult.MarketAnalysis?.Trends != null)
                {
                    AddSectionHeading(body, "Key Trends");
                    foreach (var trend in workflowResult.MarketAnalysis.Trends)
                    {
                        AddBulletPoint(body, trend);
                    }
                }

                if (workflowResult.MarketAnalysis?.PainPoints != null)
                {
                    AddSectionHeading(body, "Enterprise Pain Points");
                    foreach (var pain in workflowResult.MarketAnalysis.PainPoints)
                    {
                        AddBulletPoint(body, pain);
                    }
                }

                AddServiceAlignmentSection(body, workflowResult.ServiceAlignment);

                AddFooter(body);

                mainPart.Document.Save();
                _logger.LogInformation("✓ Market analysis report created: {File}", fileName);
            }

            return fileName;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "✗ Error generating market analysis report");
            throw;
        }
    }

    private void AddHeader(Body body)
    {
        AddParagraph(body, _theme.BrandUppercase,
            fontSize: "24", color: _theme.PrimaryHex, isBold: true, fontFamily: _theme.HeadingFont);

        if (!string.IsNullOrEmpty(_theme.Tagline))
        {
            AddParagraph(body, _theme.Tagline,
                fontSize: "12", color: _theme.SecondaryHex, isBold: true, fontFamily: _theme.HeadingFont);
        }

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

        var lines = content.Split('\n');
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                AddParagraph(body, "");
            }
            else if (line.StartsWith("# "))
            {
                AddParagraph(body, line.Substring(2),
                    fontSize: "28", color: _theme.PrimaryHex, isBold: true, fontFamily: _theme.HeadingFont);
            }
            else if (line.StartsWith("## "))
            {
                AddParagraph(body, line.Substring(3),
                    fontSize: "20", color: _theme.SecondaryHex, isBold: true, fontFamily: _theme.HeadingFont);
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
        AddParagraph(body, string.Join(" • ", keywords),
            fontSize: "11", color: _theme.MutedHex, isItalic: true);
    }

    private void AddSectionHeading(Body body, string text)
    {
        AddParagraph(body, text,
            fontSize: "20", color: _theme.PrimaryHex, isBold: true, fontFamily: _theme.HeadingFont);
    }

    private void AddSubsectionHeading(Body body, string text)
    {
        AddParagraph(body, text,
            fontSize: "16", color: _theme.SecondaryHex, isBold: true, fontFamily: _theme.HeadingFont);
    }

    /// <summary>
    /// Add a paragraph with optional formatting. Defaults pull from BrandingTheme so
    /// body text uses the company body font and dark colour without callers thinking about it.
    /// </summary>
    private void AddParagraph(Body body, string text, string fontSize = "11",
        string? color = null, bool isBold = false, bool isItalic = false, string? fontFamily = null)
    {
        var paragraph = new Paragraph();
        var run = new Run();
        var runProperties = new RunProperties();

        if (isBold) runProperties.Append(new Bold());
        if (isItalic) runProperties.Append(new Italic());

        runProperties.Append(new FontSize { Val = fontSize + "pt" });
        runProperties.Append(new Color { Val = color ?? _theme.DarkHex });

        var resolvedFont = fontFamily ?? _theme.BodyFont;
        runProperties.Append(new RunFonts { Ascii = resolvedFont, HighAnsi = resolvedFont });

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
        runProperties.Append(new Color { Val = _theme.DarkHex });
        runProperties.Append(new RunFonts { Ascii = _theme.BodyFont, HighAnsi = _theme.BodyFont });

        run.Append(runProperties);
        run.Append(new Text { Text = text });

        paragraph.Append(pPr);
        paragraph.Append(run);
        body.Append(paragraph);
    }

    private void AddCalloutBox(Body body, string title, string content, bool isHighlight = false)
    {
        // Highlighted callouts (e.g. "Recommended Focus") use the accent colour;
        // regular callouts use the secondary colour for the title bar.
        var titleColor = isHighlight ? _theme.AccentHex : _theme.SecondaryHex;

        AddParagraph(body, title, fontSize: "14", color: titleColor, isBold: true, fontFamily: _theme.HeadingFont);
        AddParagraph(body, content, fontSize: "11", color: _theme.DarkHex);
        AddParagraph(body, "");
    }

    private void AddFooter(Body body)
    {
        var paragraph = new Paragraph(new ParagraphProperties(new ParagraphBorders
        {
            TopBorder = new TopBorder { Val = BorderValues.Single, Color = _theme.PrimaryHex, Size = 12 }
        }));
        body.Append(paragraph);

        AddParagraph(body, _theme.FooterText,
            fontSize: "10", color: _theme.MutedHex, isItalic: true);
    }
}
