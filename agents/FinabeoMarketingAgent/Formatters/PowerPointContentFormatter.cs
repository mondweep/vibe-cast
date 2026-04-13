using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Presentation;
using A = DocumentFormat.OpenXml.Drawing;
using FinabeoMarketingAgent.Models;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FinabeoMarketingAgent.Formatters;

/// <summary>
/// Generates branded PowerPoint presentations with robust structure to avoid repair errors
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
        }
        catch { }
    }

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

                // 1. Create Slide Master
                var slideMasterPart = presentationPart.AddNewPart<SlideMasterPart>();
                InitSlideMasterPart(slideMasterPart);

                // 2. Add Theme to Master (Required for validation)
                var themePart = slideMasterPart.AddNewPart<ThemePart>();
                themePart.Theme = CreateTheme();

                // 3. Create Slide Layout
                var slideLayoutPart = slideMasterPart.AddNewPart<SlideLayoutPart>();
                InitSlideLayoutPart(slideLayoutPart);

                // 4. Link Layout to Master explicitly
                slideMasterPart.SlideMaster.SlideLayoutIdList!.Append(new SlideLayoutId 
                { 
                    Id = 2147483649U, 
                    RelationshipId = slideMasterPart.GetIdOfPart(slideLayoutPart) 
                });

                // 5. Setup Presentation parts
                presentationPart.Presentation.SlideMasterIdList = new SlideMasterIdList(
                    new SlideMasterId { Id = 2147483648U, RelationshipId = presentationPart.GetIdOfPart(slideMasterPart) }
                );
                presentationPart.Presentation.SlideIdList = new SlideIdList();

                // 6. Generate Slides
                AddSlide(presentationPart, slideLayoutPart, 256U, (part) => 
                    CreateTitleSlide(part, "Finabeo: Market-Service Alignment", "Executive Strategy Brief", workflowResult));

                AddSlide(presentationPart, slideLayoutPart, 257U, (part) => 
                    CreateMarketInsightsSlide(part, workflowResult.MarketAnalysis));

                AddSlide(presentationPart, slideLayoutPart, 258U, (part) => 
                    CreateServiceAlignmentSlide(part, workflowResult.ServiceAlignment));

                AddSlide(presentationPart, slideLayoutPart, 259U, (part) => 
                    CreateStrategySlide(part, workflowResult));

                presentationPart.Presentation.Save();
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

    private void AddSlide(PresentationPart presentationPart, SlideLayoutPart layoutPart, uint slideId, Action<SlidePart> buildAction)
    {
        var slidePart = presentationPart.AddNewPart<SlidePart>();
        buildAction(slidePart);
        slidePart.AddPart(layoutPart);
        
        var presentation = presentationPart.Presentation;
        if (presentation.SlideIdList == null) presentation.SlideIdList = new SlideIdList();

        var id = presentation.SlideIdList.ChildElements.Count > 0 
            ? ((SlideId)presentation.SlideIdList.LastChild!).Id!.Value + 1 
            : slideId;

        presentation.SlideIdList.Append(new SlideId { Id = id, RelationshipId = presentationPart.GetIdOfPart(slidePart) });
    }

    private void InitSlideMasterPart(SlideMasterPart slideMasterPart)
    {
        var slideMaster = new SlideMaster(
            new CommonSlideData(new ShapeTree(
                new NonVisualGroupShapeProperties(
                    new NonVisualDrawingProperties { Id = 1U, Name = "" },
                    new NonVisualGroupShapeDrawingProperties(),
                    new ApplicationNonVisualDrawingProperties()),
                new GroupShapeProperties(new A.TransformGroup())
            )),
            new ColorMap { Background1 = A.ColorSchemeIndexValues.Light1, Text1 = A.ColorSchemeIndexValues.Dark1, Background2 = A.ColorSchemeIndexValues.Light2, Text2 = A.ColorSchemeIndexValues.Dark2, Accent1 = A.ColorSchemeIndexValues.Accent1, Accent2 = A.ColorSchemeIndexValues.Accent2, Accent3 = A.ColorSchemeIndexValues.Accent3, Accent4 = A.ColorSchemeIndexValues.Accent4, Accent5 = A.ColorSchemeIndexValues.Accent5, Accent6 = A.ColorSchemeIndexValues.Accent6, Hyperlink = A.ColorSchemeIndexValues.Hyperlink, FollowedHyperlink = A.ColorSchemeIndexValues.FollowedHyperlink },
            new SlideLayoutIdList(),
            new TextStyles()
        );
        slideMasterPart.SlideMaster = slideMaster;
    }

    private void InitSlideLayoutPart(SlideLayoutPart slideLayoutPart)
    {
        slideLayoutPart.SlideLayout = new SlideLayout(
            new CommonSlideData(new ShapeTree(
                new NonVisualGroupShapeProperties(
                    new NonVisualDrawingProperties { Id = 1U, Name = "" },
                    new NonVisualGroupShapeDrawingProperties(),
                    new ApplicationNonVisualDrawingProperties()),
                new GroupShapeProperties(new A.TransformGroup())
            ))
        );
    }

    private void CreateTitleSlide(SlidePart slidePart, string title, string subtitle, WorkflowResult result)
    {
        var slide = new Slide(new CommonSlideData(new ShapeTree(
            new NonVisualGroupShapeProperties(new NonVisualDrawingProperties { Id = 1U, Name = "" }, new NonVisualGroupShapeDrawingProperties(), new ApplicationNonVisualDrawingProperties()),
            new GroupShapeProperties(new A.TransformGroup()),
            new Background(new BackgroundProperties(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Accent1 }))),
            CreateTextShape(2, 914400, 1828800, 8229600, 1200000, "FINABEO", 6000, "FFFFFF", true),
            CreateTextShape(3, 914400, 3200000, 8229600, 2000000, title, 4400, "FFFFFF"),
            CreateTextShape(4, 914400, 5943600, 8229600, 685800, DateTime.UtcNow.ToString("MMMM dd, yyyy"), 2400, "00B4D8")
        )));
        slidePart.Slide = slide;
    }

    private void CreateMarketInsightsSlide(SlidePart slidePart, MarketAnalysis? analysis)
    {
        var slide = new Slide(new CommonSlideData(new ShapeTree(
            new NonVisualGroupShapeProperties(new NonVisualDrawingProperties { Id = 1U, Name = "" }, new NonVisualGroupShapeDrawingProperties(), new ApplicationNonVisualDrawingProperties()),
            new GroupShapeProperties(new A.TransformGroup()),
            CreateTextShape(2, 457200, 274638, 8763600, 914400, "Market Insights & Trends", 4400, "003366", true)
        )));

        var yPosition = 1300000;
        uint shapeId = 3;
        if (analysis?.MarketInsights != null)
        {
            foreach (var insight in analysis.MarketInsights.Take(2))
            {
                var text = $"📊 {insight.Trend}\n\nPain: {insight.PainPoint}\n\nOpportunity: {insight.OpportunityDescription}";
                slide.CommonSlideData.ShapeTree!.Append(CreateTextShape(shapeId++, 457200, yPosition, 8763600, 2400000, text, 1600));
                yPosition += 2600000; // Increased spacing to prevent overlap
            }
        }
        slidePart.Slide = slide;
    }

    private void CreateServiceAlignmentSlide(SlidePart slidePart, ServiceAlignment? alignment)
    {
        var slide = new Slide(new CommonSlideData(new ShapeTree(
            new NonVisualGroupShapeProperties(new NonVisualDrawingProperties { Id = 1U, Name = "" }, new NonVisualGroupShapeDrawingProperties(), new ApplicationNonVisualDrawingProperties()),
            new GroupShapeProperties(new A.TransformGroup()),
            CreateTextShape(2, 457200, 274638, 8763600, 914400, "Finabeo Service Alignment", 4400, "003366", true)
        )));

        var yPosition = 1300000;
        uint shapeId = 3;
        if (alignment?.FinabeoServices != null)
        {
            foreach (var service in alignment.FinabeoServices)
            {
                var text = $"✓ {service.ServiceName} ({service.AlignmentScore*100:F0}% Fit)\n\n{service.WhyFit}\n\nKey Benefits:\n• {string.Join("\n• ", service.KeyBenefitsToHighlight ?? new List<string>())}";
                slide.CommonSlideData.ShapeTree!.Append(CreateTextShape(shapeId++, 457200, yPosition, 8763600, 2600000, text, 1500));
                yPosition += 2800000; // Increased spacing
            }
        }
        slidePart.Slide = slide;
    }

    private void CreateStrategySlide(SlidePart slidePart, WorkflowResult result)
    {
        var slide = new Slide(new CommonSlideData(new ShapeTree(
            new NonVisualGroupShapeProperties(new NonVisualDrawingProperties { Id = 1U, Name = "" }, new NonVisualGroupShapeDrawingProperties(), new ApplicationNonVisualDrawingProperties()),
            new GroupShapeProperties(new A.TransformGroup()),
            CreateTextShape(2, 457200, 274638, 8763600, 914400, "Go-to-Market Strategy", 4400, "003366", true)
        )));

        var strategyText = $"Target Focus:\n• {result.ServiceAlignment?.RecommendedFocus ?? "Enterprise reach"}\n\nKey Themes:\n• {string.Join("\n• ", result.ServiceAlignment?.ContentThemes?.Take(4) ?? new List<string>())}\n\nEngagement Rule:\n• Lead with FinOps ROI to fund Agentic AI pilots.";
        slide.CommonSlideData.ShapeTree!.Append(CreateTextShape(3, 457200, 1371600, 8763600, 4500000, strategyText, 1800));

        slidePart.Slide = slide;
    }

    private DocumentFormat.OpenXml.Presentation.Shape CreateTextShape(uint id, long x, long y, long width, long height, string text, int fontSize, string color = "003366", bool isBold = false)
    {
        var shape = new DocumentFormat.OpenXml.Presentation.Shape(
            new NonVisualShapeProperties(
                new NonVisualDrawingProperties { Id = id, Name = "Text Box " + id },
                new NonVisualShapeDrawingProperties(new A.ShapeLocks { NoGrouping = true }),
                new ApplicationNonVisualDrawingProperties()
            ),
            new ShapeProperties(
                new A.Transform2D(new A.Offset { X = x, Y = y }, new A.Extents { Cx = width, Cy = height }),
                new A.PresetGeometry { Preset = A.ShapeTypeValues.Rectangle }
            ),
            new TextBody(
                new A.BodyProperties { Wrap = A.TextWrappingValues.Square },
                new A.ListStyle()
            )
        );

        foreach (var line in text.Split('\n'))
        {
            var rPr = new A.RunProperties { Language = "en-US", FontSize = fontSize };
            if (isBold) rPr.Bold = true;
            rPr.Append(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Accent1 }));
            rPr.Append(new A.LatinFont { Typeface = "Montserrat" });

            shape.TextBody!.Append(new A.Paragraph(new A.ParagraphProperties { Level = 0 }, new A.Run(rPr, new A.Text(line))));
        }
        return shape;
    }

    private A.Theme CreateTheme()
    {
        var theme = new A.Theme { Name = "Office Theme" };
        var themeElements = new A.ThemeElements();
        
        var colorScheme = new A.ColorScheme { Name = "Office" };
        colorScheme.Append(new A.Dark1Color(new A.SystemColor { Val = A.SystemColorValues.WindowText, LastColor = "000000" }));
        colorScheme.Append(new A.Light1Color(new A.SystemColor { Val = A.SystemColorValues.Window, LastColor = "FFFFFF" }));
        colorScheme.Append(new A.Dark2Color(new A.RgbColorModelHex { Val = "44546A" }));
        colorScheme.Append(new A.Light2Color(new A.RgbColorModelHex { Val = "E7E6E6" }));
        colorScheme.Append(new A.Accent1Color(new A.RgbColorModelHex { Val = "4472C4" }));
        colorScheme.Append(new A.Accent2Color(new A.RgbColorModelHex { Val = "ED7D31" }));
        colorScheme.Append(new A.Accent3Color(new A.RgbColorModelHex { Val = "A5A5A5" }));
        colorScheme.Append(new A.Accent4Color(new A.RgbColorModelHex { Val = "FFC000" }));
        colorScheme.Append(new A.Accent5Color(new A.RgbColorModelHex { Val = "5B9BD5" }));
        colorScheme.Append(new A.Accent6Color(new A.RgbColorModelHex { Val = "70AD47" }));
        colorScheme.Append(new A.Hyperlink(new A.RgbColorModelHex { Val = "0563C1" }));
        colorScheme.Append(new A.FollowedHyperlinkColor(new A.RgbColorModelHex { Val = "954F72" }));
        
        themeElements.Append(colorScheme);
        themeElements.Append(new A.FontScheme(
            new A.MajorFont(new A.LatinFont { Typeface = "Calibri Light" }),
            new A.MinorFont(new A.LatinFont { Typeface = "Calibri" })
        ) { Name = "Office" });
        
        themeElements.Append(new A.FormatScheme(
            new A.FillStyleList(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor })),
            new A.LineStyleList(new A.Outline(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor })) { Width = 6350 }),
            new A.EffectStyleList(new A.EffectStyle(new A.EffectList())),
            new A.BackgroundFillStyleList(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }))
        ) { Name = "Office" });
        
        theme.Append(themeElements);
        return theme;
    }
}
