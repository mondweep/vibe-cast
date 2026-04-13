using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Presentation;
using A = DocumentFormat.OpenXml.Drawing;
using FinabeoMarketingAgent.Models;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Xml.Linq;

namespace FinabeoMarketingAgent.Formatters;

/// <summary>
/// Generates branded PowerPoint presentations from marketing content
/// </summary>
public class PowerPointContentFormatter
{
    private readonly string _brandingConfigPath;
    private readonly ILogger<PowerPointContentFormatter> _logger;
    private Dictionary<string, object>? _brandingConfig;

    public PowerPointContentFormatter(string brandingConfigPath, ILogger<PowerPointContentFormatter> logger)
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
        }
    }

    /// <summary>
    /// Generate a branded PowerPoint presentation with market analysis and insights
    /// </summary>
    public async Task<string> GenerateMarketAnalysisDeckAsync(WorkflowResult workflowResult)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
        var fileName = $"output/finabeo-market-deck-{timestamp}.pptx";

        try
        {
            using (var presentationDocument = PresentationDocument.Create(fileName, PresentationDocumentType.Presentation))
            {
                var presentationPart = presentationDocument.AddPresentationPart();
                presentationPart.Presentation = new Presentation();

                var slideMasterPart = presentationPart.AddNewPart<SlideMasterPart>();
                var slideLayoutPart = slideMasterPart.AddNewPart<SlideLayoutPart>();

                var slide1Part = presentationPart.AddNewPart<SlidePart>();
                var slide2Part = presentationPart.AddNewPart<SlidePart>();
                var slide3Part = presentationPart.AddNewPart<SlidePart>();

                presentationPart.Presentation.SlideMasterIdList = new SlideMasterIdList(
                    new SlideMasterId { Id = 256U, RelationshipId = presentationPart.CreateRelationshipToPart(slideMasterPart) }
                );

                presentationPart.Presentation.SlideIdList = new SlideIdList(
                    new SlideId { Id = 256U, RelationshipId = presentationPart.CreateRelationshipToPart(slide1Part) },
                    new SlideId { Id = 257U, RelationshipId = presentationPart.CreateRelationshipToPart(slide2Part) },
                    new SlideId { Id = 258U, RelationshipId = presentationPart.CreateRelationshipToPart(slide3Part) }
                );

                // Slide 1: Title Slide
                CreateTitleSlide(slide1Part, "Market Analysis & Finabeo Services", "Enterprise Insights", workflowResult);

                // Slide 2: Market Insights
                CreateMarketInsightsSlide(slide2Part, workflowResult.MarketAnalysis);

                // Slide 3: Service Alignment
                CreateServiceAlignmentSlide(slide3Part, workflowResult.ServiceAlignment);

                presentationDocument.Save();
                _logger.LogInformation($"✓ PowerPoint presentation created: {fileName}");
            }

            return fileName;
        }
        catch (Exception ex)
        {
            _logger.LogError($"✗ Error generating PowerPoint: {ex.Message}");
            throw;
        }
    }

    private void CreateTitleSlide(SlidePart slidePart, string title, string subtitle, WorkflowResult result)
    {
        var slide = new Slide();

        var background = new Background(new BackgroundProperties(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Accent1 })));

        // Add title shape
        var titleShape = CreateTextShape(
            x: 914400,      // 1 inch
            y: 1828800,     // 2 inches
            width: 8229600, // 9 inches
            height: 1828800, // 2 inches
            text: "FINABEO",
            fontSize: 6000, // 60pt
            color: "FFFFFF"
        );

        // Add subtitle shape
        var subtitleShape = CreateTextShape(
            x: 914400,
            y: 3657600,     // 4 inches
            width: 8229600,
            height: 2743200, // 3 inches
            text: title,
            fontSize: 5400, // 54pt
            color: "FFFFFF"
        );

        // Add date
        var dateShape = CreateTextShape(
            x: 914400,
            y: 5943600,     // 6.5 inches
            width: 8229600,
            height: 685800,
            text: DateTime.UtcNow.ToString("MMMM dd, yyyy"),
            fontSize: 2400, // 24pt
            color: "00B4D8"
        );

        slide.CommonSlideData = new CommonSlideData();
        slide.CommonSlideData.ShapeTree = new ShapeTree();
        slide.CommonSlideData.ShapeTree.Append(new NonVisualGroupShapeProperties());
        slide.CommonSlideData.ShapeTree.Append(new DocumentFormat.OpenXml.Presentation.GroupShapeProperties());
        slide.CommonSlideData.ShapeTree.Append(titleShape);
        slide.CommonSlideData.ShapeTree.Append(subtitleShape);
        slide.CommonSlideData.ShapeTree.Append(dateShape);

//         slide.ColorMapOverride = new ColorMapOverride { MasterColorMapping = new DocumentFormat.OpenXml.Presentation.MasterColorMapping() };

        slidePart.Slide = slide;
    }

    private void CreateMarketInsightsSlide(SlidePart slidePart, MarketAnalysis? analysis)
    {
        var slide = new Slide();

        var heading = CreateTextShape(
            x: 457200,
            y: 274638,
            width: 8763600,
            height: 914400,
            text: "Market Insights & Trends",
            fontSize: 4400,
            color: "003366",
            isBold: true
        );

        slide.CommonSlideData = new CommonSlideData();
        slide.CommonSlideData.ShapeTree = new ShapeTree();
        slide.CommonSlideData.ShapeTree.Append(new NonVisualGroupShapeProperties());
        slide.CommonSlideData.ShapeTree.Append(new DocumentFormat.OpenXml.Presentation.GroupShapeProperties());
        slide.CommonSlideData.ShapeTree.Append(heading);

        var yPosition = 1371600; // Start below heading

        if (analysis?.MarketInsights != null)
        {
            foreach (var insight in analysis.MarketInsights.Take(2))
            {
                var insightText = $"📊 {insight.Trend}\n\n" +
                    $"Pain Point: {insight.PainPoint}\n\n" +
                    $"Opportunity: {insight.OpportunityDescription}";

                var insightShape = CreateTextShape(
                    x: 457200,
                    y: yPosition,
                    width: 8763600,
                    height: 1371600,
                    text: insightText,
                    fontSize: 1800,
                    color: "2B2B2B"
                );

                slide.CommonSlideData.ShapeTree.Append(insightShape);
                yPosition += 1600200;
            }
        }

//         slide.ColorMapOverride = new ColorMapOverride { MasterColorMapping = new DocumentFormat.OpenXml.Presentation.MasterColorMapping() };
        slidePart.Slide = slide;
    }

    private void CreateServiceAlignmentSlide(SlidePart slidePart, ServiceAlignment? alignment)
    {
        var slide = new Slide();

        var heading = CreateTextShape(
            x: 457200,
            y: 274638,
            width: 8763600,
            height: 914400,
            text: "Finabeo Service Alignment",
            fontSize: 4400,
            color: "003366",
            isBold: true
        );

        slide.CommonSlideData = new CommonSlideData();
        slide.CommonSlideData.ShapeTree = new ShapeTree();
        slide.CommonSlideData.ShapeTree.Append(new NonVisualGroupShapeProperties());
        slide.CommonSlideData.ShapeTree.Append(new DocumentFormat.OpenXml.Presentation.GroupShapeProperties());
        slide.CommonSlideData.ShapeTree.Append(heading);

        var yPosition = 1371600;

        if (alignment?.FinabeoServices != null)
        {
            foreach (var service in alignment.FinabeoServices)
            {
                var scorePercent = (service.AlignmentScore * 100).ToString("F0");
                var serviceText = $"✓ {service.ServiceName} ({scorePercent}% Alignment)\n\n" +
                    $"{service.WhyFit}\n\n" +
                    $"Key Benefits:\n• {string.Join("\n• ", service.KeyBenefitsToHighlight ?? new List<string>())}";

                var serviceShape = CreateTextShape(
                    x: 457200,
                    y: yPosition,
                    width: 8763600,
                    height: 1600200,
                    text: serviceText,
                    fontSize: 1700,
                    color: service.AlignmentScore > 0.9 ? "00B4D8" : "FFB81C"
                );

                slide.CommonSlideData.ShapeTree.Append(serviceShape);
                yPosition += 1828800;
            }
        }

        // slide.ColorMapOverride = new ColorMapOverride { MasterColorMapping = new MasterColorMapping() };
        slidePart.Slide = slide;
    }

    private DocumentFormat.OpenXml.Presentation.Shape CreateTextShape(long x, long y, long width, long height, string text,
        int fontSize = 2400, string color = "2B2B2B", bool isBold = false)
    {
        var shape = new DocumentFormat.OpenXml.Presentation.Shape();

        var nvSpPr = new NonVisualShapeProperties();
        var cNvPr = new NonVisualDrawingProperties { Id = 2U, Name = "Text Box" };
        var cNvSpPr = new NonVisualShapeDrawingProperties();
        var spLocks = new A.ShapeLocks { NoGrouping = true };
        cNvSpPr.Append(spLocks);
        nvSpPr.Append(cNvPr);
        nvSpPr.Append(cNvSpPr);

        var spPr = new ShapeProperties();
        var xfrm = new A.Transform2D();
        var off = new A.Offset { X = x, Y = y };
        var ext = new A.Extents { Cx = width, Cy = height };
        xfrm.Append(off);
        xfrm.Append(ext);
        spPr.Append(xfrm);
        spPr.Append(new A.PresetGeometry { Preset = A.ShapeTypeValues.Rectangle });

        var txBody = new TextBody();
        txBody.Append(new A.BodyProperties { Wrap = A.TextWrappingValues.Square });
        txBody.Append(new A.ListStyle());

        var paragraph = new A.Paragraph();
        var pPr = new A.ParagraphProperties { Level = 0 };
        paragraph.Append(pPr);

        var run = new A.Run();
        var rPr = new A.RunProperties { Language = "en-US", FontSize = fontSize };

        if (isBold)
            rPr.Bold = true;

        rPr.Append(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Accent1 }));
        rPr.Append(new A.LatinFont { Typeface = "Montserrat" });

        run.Append(rPr);
        run.Append(new A.Text { Text = text });
        paragraph.Append(run);
        txBody.Append(paragraph);

        shape.Append(nvSpPr);
        shape.Append(spPr);
        shape.Append(txBody);

        return shape;
    }
}
