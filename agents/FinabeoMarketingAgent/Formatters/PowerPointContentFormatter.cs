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
                
                // 1. Initialize Presentation with STRICT schema order
                var presentation = new Presentation();
                presentation.Append(new SlideMasterIdList());
                presentation.Append(new SlideIdList());
                presentation.Append(new SlideSize { Cx = 12192000, Cy = 6858000, Type = SlideSizeValues.Screen16x9 });
                presentation.Append(new NotesSize { Cx = 6858000, Cy = 9144000 });
                presentationPart.Presentation = presentation;

                // 2. Create Slide Master
                var slideMasterPart = presentationPart.AddNewPart<SlideMasterPart>();
                InitSlideMasterPart(slideMasterPart);

                // 3. Add Theme to Master (Full Scheme for desktop PowerPoint)
                var themePart = slideMasterPart.AddNewPart<ThemePart>();
                themePart.Theme = CreateTheme();

                // 4. Create Slide Layout (Explicit Type)
                var slideLayoutPart = slideMasterPart.AddNewPart<SlideLayoutPart>();
                InitSlideLayoutPart(slideLayoutPart);

                // 5. Explicit Linkage
                slideLayoutPart.AddPart(slideMasterPart);
                slideMasterPart.SlideMaster.SlideLayoutIdList!.Append(new SlideLayoutId 
                { 
                    Id = 2147483649U, 
                    RelationshipId = slideMasterPart.GetIdOfPart(slideLayoutPart) 
                });

                // 6. Presentation Metadata
                presentation.SlideMasterIdList!.Append(
                    new SlideMasterId { Id = 2147483648U, RelationshipId = presentationPart.GetIdOfPart(slideMasterPart) }
                );

                var viewPropsPart = presentationPart.AddNewPart<ViewPropertiesPart>();
                viewPropsPart.ViewProperties = new ViewProperties(new NormalViewProperties());
                
                var presPropsPart = presentationPart.AddNewPart<PresentationPropertiesPart>();
                presPropsPart.PresentationProperties = new PresentationProperties();

                // 7. Generate Slides (Standard 256-start sequence)
                AddSlide(presentationPart, slideLayoutPart, 0, (part) => 
                    CreateTitleSlide(part, "Finabeo: Market-Service Alignment", "Executive Strategy Brief", workflowResult));

                AddSlide(presentationPart, slideLayoutPart, 1, (part) => 
                    CreateMarketInsightsSlide(part, workflowResult.MarketAnalysis));

                AddSlide(presentationPart, slideLayoutPart, 2, (part) => 
                    CreateServiceAlignmentSlide(part, workflowResult.ServiceAlignment));

                AddSlide(presentationPart, slideLayoutPart, 3, (part) => 
                    CreateStrategySlide(part, workflowResult));

                presentationPart.Presentation.Save();
                slideMasterPart.SlideMaster.Save();
                slideLayoutPart.SlideLayout.Save();
                presentationDocument.Save();
                _logger.LogInformation($"✓ PowerPoint presentation created: {fileName}");
            }
            return fileName;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating PowerPoint deck");
            throw;
        }
    }

    private void AddSlide(PresentationPart presentationPart, SlideLayoutPart layoutPart, uint slideIndex, Action<SlidePart> createSlideContent)
    {
        var slidePart = presentationPart.AddNewPart<SlidePart>();
        slidePart.AddPart(layoutPart, "rId1");

        createSlideContent(slidePart);
        slidePart.Slide.Save();

        var presentation = presentationPart.Presentation;
        if (presentation.SlideIdList == null)
        {
            presentation.SlideIdList = new SlideIdList();
        }

        uint slideId = 256 + slideIndex; 
        var relId = presentationPart.GetIdOfPart(slidePart);
        presentation.SlideIdList.Append(new SlideId { Id = slideId, RelationshipId = relId });
    }

    private void InitSlideMasterPart(SlideMasterPart slideMasterPart)
    {
        var slideMaster = new SlideMaster(
            new CommonSlideData(new ShapeTree(
                new NonVisualGroupShapeProperties(
                    new NonVisualDrawingProperties { Id = 1U, Name = "MasterGroup" },
                    new NonVisualGroupShapeDrawingProperties(),
                    new ApplicationNonVisualDrawingProperties()),
                new GroupShapeProperties(new A.TransformGroup())
            )),
            new ColorMap 
            { 
                Background1 = A.ColorSchemeIndexValues.Light1, 
                Text1 = A.ColorSchemeIndexValues.Dark1, 
                Background2 = A.ColorSchemeIndexValues.Light2, 
                Text2 = A.ColorSchemeIndexValues.Dark2, 
                Accent1 = A.ColorSchemeIndexValues.Accent1, 
                Accent2 = A.ColorSchemeIndexValues.Accent2, 
                Accent3 = A.ColorSchemeIndexValues.Accent3, 
                Accent4 = A.ColorSchemeIndexValues.Accent4, 
                Accent5 = A.ColorSchemeIndexValues.Accent5, 
                Accent6 = A.ColorSchemeIndexValues.Accent6, 
                Hyperlink = A.ColorSchemeIndexValues.Hyperlink, 
                FollowedHyperlink = A.ColorSchemeIndexValues.FollowedHyperlink 
            },
            new SlideLayoutIdList(),
            new TextStyles(
                new TitleStyle(
                    new A.Level1ParagraphProperties(
                        new A.DefaultRunProperties(
                            new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Text1 }),
                            new A.LatinFont { Typeface = "Montserrat" }
                        ) { Language = "en-US", FontSize = 4400 }
                    )
                ),
                new BodyStyle(
                    new A.Level1ParagraphProperties(
                        new A.DefaultRunProperties(
                            new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Text1 }),
                            new A.LatinFont { Typeface = "Montserrat" }
                        ) { Language = "en-US", FontSize = 1800 }
                    )
                ),
                new OtherStyle(
                    new A.Level1ParagraphProperties(
                        new A.DefaultRunProperties(
                            new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Text1 }),
                            new A.LatinFont { Typeface = "Montserrat" }
                        ) { Language = "en-US", FontSize = 1200 }
                    )
                )
            )
        );
        slideMasterPart.SlideMaster = slideMaster;
    }

    private void InitSlideLayoutPart(SlideLayoutPart layoutPart)
    {
        layoutPart.SlideLayout = new SlideLayout(
            new CommonSlideData(new ShapeTree(
                new NonVisualGroupShapeProperties(
                    new NonVisualDrawingProperties { Id = 1U, Name = "LayoutGroup" },
                    new NonVisualGroupShapeDrawingProperties(),
                    new ApplicationNonVisualDrawingProperties()),
                new GroupShapeProperties(new A.TransformGroup())
            )),
            new ColorMapOverride(new A.MasterColorMapping())
        ) { Type = SlideLayoutValues.Blank };
    }

    private void CreateTitleSlide(SlidePart slidePart, string title, string subtitle, WorkflowResult result)
    {
        var slide = new Slide(
            new CommonSlideData(
                new Background(new BackgroundProperties(
                    new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Accent1 })
                )),
                new ShapeTree(
                    new NonVisualGroupShapeProperties(
                        new NonVisualDrawingProperties { Id = 1U, Name = "TitleGroup" }, 
                        new NonVisualGroupShapeDrawingProperties(), 
                        new ApplicationNonVisualDrawingProperties()),
                    new GroupShapeProperties(new A.TransformGroup()),
                    CreateTextShape(2, 914400, 1828800, 8229600, 1200000, "FINABEO", 6000, A.SchemeColorValues.Light1, true),
                    CreateTextShape(3, 914400, 3200000, 8229600, 2000000, title, 4400, A.SchemeColorValues.Light1, false),
                    CreateTextShape(4, 914400, 5943600, 8229600, 685800, DateTime.UtcNow.ToString("MMMM dd, yyyy"), 2400, A.SchemeColorValues.Accent4, false)
                )
            )
        );
        slidePart.Slide = slide;
    }

    private void CreateMarketInsightsSlide(SlidePart slidePart, MarketAnalysis? analysis)
    {
        var slide = new Slide(
            new CommonSlideData(
                new Background(new BackgroundProperties(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Light1 }))),
                new ShapeTree(
                    new NonVisualGroupShapeProperties(
                        new NonVisualDrawingProperties { Id = 1U, Name = "InsightsGroup" }, 
                        new NonVisualGroupShapeDrawingProperties(), 
                        new ApplicationNonVisualDrawingProperties()),
                    new GroupShapeProperties(new A.TransformGroup()),
                    CreateTextShape(2, 457200, 274638, 8763600, 914400, "Market Insights & Trends", 4400, A.SchemeColorValues.Accent1, true)
                )
            )
        ) { ShowMasterShapes = false };

        var yPosition = 1300000;
        uint shapeId = 3;
        if (analysis?.MarketInsights != null)
        {
            foreach (var insight in analysis.MarketInsights.Take(2))
            {
                var text = $"Trend: {insight.Trend}\n\nPain: {insight.PainPoint}\n\nOpportunity: {insight.OpportunityDescription}";
                slide.CommonSlideData!.ShapeTree!.Append(CreateTextShape(shapeId++, 457200, yPosition, 8763600, 2400000, text, 1600, A.SchemeColorValues.Dark1, false));
                yPosition += 2600000; 
            }
        }
        slidePart.Slide = slide;
    }

    private void CreateServiceAlignmentSlide(SlidePart slidePart, ServiceAlignment? alignment)
    {
        var slide = new Slide(
            new CommonSlideData(
                new Background(new BackgroundProperties(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Light1 }))),
                new ShapeTree(
                    new NonVisualGroupShapeProperties(
                        new NonVisualDrawingProperties { Id = 1U, Name = "AlignmentGroup" }, 
                        new NonVisualGroupShapeDrawingProperties(), 
                        new ApplicationNonVisualDrawingProperties()),
                    new GroupShapeProperties(new A.TransformGroup()),
                    CreateTextShape(2, 457200, 274638, 8763600, 914400, "Finabeo Service Alignment", 4400, A.SchemeColorValues.Accent1, true)
                )
            )
        ) { ShowMasterShapes = false };

        var yPosition = 1300000;
        uint shapeId = 3;
        if (alignment?.FinabeoServices != null)
        {
            foreach (var service in alignment.FinabeoServices)
            {
                var text = $"Item: {service.ServiceName} ({service.AlignmentScore * 100:F0}% Fit)\n\n{service.WhyFit}\n\nKey Benefits:\n• {string.Join("\n• ", service.KeyBenefitsToHighlight ?? new List<string>())}";
                slide.CommonSlideData!.ShapeTree!.Append(CreateTextShape(shapeId++, 457200, yPosition, 8763600, 2600000, text, 1500, A.SchemeColorValues.Dark1, false));
                yPosition += 2800000; 
            }
        }
        slidePart.Slide = slide;
    }

    private void CreateStrategySlide(SlidePart slidePart, WorkflowResult result)
    {
        var slide = new Slide(
            new CommonSlideData(
                new Background(new BackgroundProperties(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Light1 }))),
                new ShapeTree(
                    new NonVisualGroupShapeProperties(
                        new NonVisualDrawingProperties { Id = 1U, Name = "StrategyGroup" }, 
                        new NonVisualGroupShapeDrawingProperties(), 
                        new ApplicationNonVisualDrawingProperties()),
                    new GroupShapeProperties(new A.TransformGroup()),
                    CreateTextShape(2, 457200, 274638, 8763600, 914400, "Go-to-Market Strategy", 4400, A.SchemeColorValues.Accent1, true)
                )
            )
        ) { ShowMasterShapes = false };

        var strategyText = $"Target Focus:\n• {result.ServiceAlignment?.RecommendedFocus ?? "Enterprise reach"}\n\nKey Themes:\n• {string.Join("\n• ", result.ServiceAlignment?.ContentThemes?.Take(4) ?? new List<string>())}\n\nEngagement Rule:\n• Lead with FinOps ROI to fund Agentic AI pilots.";
        slide.CommonSlideData!.ShapeTree!.Append(CreateTextShape(3, 457200, 1371600, 8763600, 4500000, strategyText, 1800, A.SchemeColorValues.Dark1, false));

        slidePart.Slide = slide;
    }

    private DocumentFormat.OpenXml.Presentation.Shape CreateTextShape(uint id, long x, long y, long width, long height, string text, int fontSize, A.SchemeColorValues color, bool isBold = false)
    {
        var nvSpPr = new NonVisualShapeProperties(
            new NonVisualDrawingProperties { Id = id, Name = "Shape " + id },
            new NonVisualShapeDrawingProperties(new A.ShapeLocks { NoGrouping = true }),
            new ApplicationNonVisualDrawingProperties()
        );

        // NOTE: We omit PlaceholderShape tags because we use a Blank layout with explicit positioning.
        // PowerPoint considers slides "corrupted" if placeholders are present but not defined in the layout.

        var shape = new DocumentFormat.OpenXml.Presentation.Shape(
            nvSpPr,
            new ShapeProperties(
                new A.Transform2D(new A.Offset { X = x, Y = y }, new A.Extents { Cx = width, Cy = height }),
                new A.PresetGeometry { Preset = A.ShapeTypeValues.Rectangle }
            ),
            new TextBody(
                new A.BodyProperties { Wrap = A.TextWrappingValues.Square },
                new A.ListStyle()
            )
        );

        foreach (var originalLine in text.Split('\n'))
        {
            var line = string.IsNullOrWhiteSpace(originalLine) ? " " : originalLine;
            var rPr = new A.RunProperties { Language = "en-US", FontSize = fontSize };
            if (isBold) rPr.Bold = true;
            rPr.Append(new A.SolidFill(new A.SchemeColor { Val = color }));
            rPr.Append(new A.LatinFont { Typeface = "Montserrat" });

            var paragraph = new A.Paragraph(
                new A.ParagraphProperties { Level = 0 },
                new A.Run(rPr, new A.Text(line))
            );
            // EndParagraphRunProperties is mandatory for stable schema rendering in some PPT versions
            paragraph.Append(new A.EndParagraphRunProperties { Language = "en-US" });
            shape.TextBody!.Append(paragraph);
        }
        return shape;
    }

    private A.Theme CreateTheme()
    {
        var themeElements = new A.ThemeElements(
            new A.ColorScheme(
                new A.Dark1Color(new A.SystemColor { Val = A.SystemColorValues.WindowText, LastColor = "000000" }),
                new A.Light1Color(new A.SystemColor { Val = A.SystemColorValues.Window, LastColor = "FFFFFF" }),
                new A.Dark2Color(new A.RgbColorModelHex { Val = "1F4E78" }),
                new A.Light2Color(new A.RgbColorModelHex { Val = "E7E6E6" }),
                new A.Accent1Color(new A.RgbColorModelHex { Val = "003366" }), // Finabeo Navy
                new A.Accent2Color(new A.RgbColorModelHex { Val = "00B4D8" }), // Cyan
                new A.Accent3Color(new A.RgbColorModelHex { Val = "FFB81C" }), // Finabeo Gold
                new A.Accent4Color(new A.RgbColorModelHex { Val = "A5A5A5" }),
                new A.Accent5Color(new A.RgbColorModelHex { Val = "264478" }),
                new A.Accent6Color(new A.RgbColorModelHex { Val = "7E9CC5" }),
                new A.Hyperlink(new A.RgbColorModelHex { Val = "0563C1" }),
                new A.FollowedHyperlinkColor(new A.RgbColorModelHex { Val = "954F72" })
            ) { Name = "Finabeo Office" },
            new A.FontScheme(
                new A.MajorFont(new A.LatinFont { Typeface = "Montserrat" }, new A.EastAsianFont { Typeface = "" }, new A.ComplexScriptFont { Typeface = "" }),
                new A.MinorFont(new A.LatinFont { Typeface = "Open Sans" }, new A.EastAsianFont { Typeface = "" }, new A.ComplexScriptFont { Typeface = "" })
            ) { Name = "Finabeo Fonts" },
            new A.FormatScheme(
                new A.FillStyleList(
                    new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }),
                    new A.GradientFill(
                        new A.GradientStopList(
                            new A.GradientStop(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }) { Position = 0 },
                            new A.GradientStop(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }) { Position = 100000 }
                        ),
                        new A.LinearGradientFill { Angle = 5400000, Scaled = false }
                    ),
                    new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor })
                ),
                new A.LineStyleList(
                    new A.Outline(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor })) { Width = 6350, CapType = A.LineCapValues.Flat, CompoundLineType = A.CompoundLineValues.Single },
                    new A.Outline(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor })) { Width = 12700 },
                    new A.Outline(new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor })) { Width = 19050 }
                ),
                new A.EffectStyleList(
                    new A.EffectStyle(new A.EffectList()),
                    new A.EffectStyle(new A.EffectList()),
                    new A.EffectStyle(new A.EffectList())
                ),
                new A.BackgroundFillStyleList(
                    new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }),
                    new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }),
                    new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor })
                )
            ) { Name = "Finabeo Format" }
        );

        return new A.Theme(themeElements) { Name = "Finabeo Standard" };
    }
}
