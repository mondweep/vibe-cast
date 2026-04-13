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
/// Generates branded PowerPoint presentations with robust structure to avoid repair errors.
///
/// Key structural requirements for valid PPTX (learned from comparing against python-pptx reference):
/// 1. Theme must be linked from BOTH the presentation level AND slide master
/// 2. TableStylesPart is required even if empty
/// 3. Presentation must include defaultTextStyle
/// 4. Text boxes must use cNvSpPr txBox="1", NOT spLocks/noGrp (that's for placeholders)
/// 5. All slides must include ColorMapOverride
/// 6. PresetGeometry must contain AdjustValueList child
/// 7. BackgroundProperties must contain EffectList after fill
/// 8. GroupShapeProperties can use empty grpSpPr (no TransformGroup needed)
/// 9. Theme objectDefaults and extraClrSchemeLst should be present
/// 10. NormalViewProperties needs RestoredLeft and RestoredTop
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

                // 1. Create Theme FIRST at presentation level (PowerPoint requires this)
                var themePart = presentationPart.AddNewPart<ThemePart>();
                themePart.Theme = CreateTheme();

                // 2. Create TableStyles part (PowerPoint expects this even if empty)
                var tableStylesPart = presentationPart.AddNewPart<TableStylesPart>();
                tableStylesPart.TableStyleList = new A.TableStyleList() { Default = "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}" };

                // 3. Create Slide Master (also references the same theme)
                var slideMasterPart = presentationPart.AddNewPart<SlideMasterPart>();
                slideMasterPart.AddPart(themePart);
                InitSlideMasterPart(slideMasterPart);

                // 4. Create Slide Layout linked to master
                var slideLayoutPart = slideMasterPart.AddNewPart<SlideLayoutPart>();
                InitSlideLayoutPart(slideLayoutPart);
                slideLayoutPart.AddPart(slideMasterPart);

                // 5. Register layout in master's layout list
                slideMasterPart.SlideMaster.SlideLayoutIdList!.Append(new SlideLayoutId
                {
                    Id = 2147483649U,
                    RelationshipId = slideMasterPart.GetIdOfPart(slideLayoutPart)
                });

                // 6. Initialize Presentation with STRICT schema order including defaultTextStyle
                var presentation = new Presentation();
                presentation.Append(new SlideMasterIdList(
                    new SlideMasterId { Id = 2147483648U, RelationshipId = presentationPart.GetIdOfPart(slideMasterPart) }
                ));
                presentation.Append(new SlideIdList());
                presentation.Append(new SlideSize { Cx = 12192000, Cy = 6858000, Type = SlideSizeValues.Screen16x9 });
                presentation.Append(new NotesSize { Cx = 6858000, Cy = 9144000 });
                presentation.Append(CreateDefaultTextStyle());
                presentationPart.Presentation = presentation;

                // 7. View and Presentation Properties
                var viewPropsPart = presentationPart.AddNewPart<ViewPropertiesPart>();
                viewPropsPart.ViewProperties = new ViewProperties(
                    new NormalViewProperties(
                        new RestoredLeft { Size = 15620 },
                        new RestoredTop { Size = 94660 }
                    )
                );

                var presPropsPart = presentationPart.AddNewPart<PresentationPropertiesPart>();
                presPropsPart.PresentationProperties = new PresentationProperties();

                // 8. Generate Slides (Standard 256-start sequence)
                AddSlide(presentationPart, slideLayoutPart, 0, (part) =>
                    CreateTitleSlide(part, "Finabeo: Market-Service Alignment", "Executive Strategy Brief", workflowResult));

                AddSlide(presentationPart, slideLayoutPart, 1, (part) =>
                    CreateMarketInsightsSlide(part, workflowResult.MarketAnalysis));

                AddSlide(presentationPart, slideLayoutPart, 2, (part) =>
                    CreateServiceAlignmentSlide(part, workflowResult.ServiceAlignment));

                AddSlide(presentationPart, slideLayoutPart, 3, (part) =>
                    CreateStrategySlide(part, workflowResult));

                // 9. Save all parts
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
            new CommonSlideData(
                new Background(
                    new BackgroundStyleReference(
                        new A.SchemeColor { Val = A.SchemeColorValues.Background1 }
                    ) { Index = 1001U }
                ),
                new ShapeTree(
                    new NonVisualGroupShapeProperties(
                        new NonVisualDrawingProperties { Id = 1U, Name = "" },
                        new NonVisualGroupShapeDrawingProperties(),
                        new ApplicationNonVisualDrawingProperties()),
                    new GroupShapeProperties()
                )
            ),
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
                    ) { Alignment = A.TextAlignmentTypeValues.Left }
                ),
                new BodyStyle(
                    new A.Level1ParagraphProperties(
                        new A.DefaultRunProperties(
                            new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Text1 }),
                            new A.LatinFont { Typeface = "Montserrat" }
                        ) { Language = "en-US", FontSize = 1800 }
                    ) { MarginLeft = 342900, Indent = -342900, Alignment = A.TextAlignmentTypeValues.Left }
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
                    new NonVisualDrawingProperties { Id = 1U, Name = "" },
                    new NonVisualGroupShapeDrawingProperties(),
                    new ApplicationNonVisualDrawingProperties()),
                new GroupShapeProperties()
            )),
            new ColorMapOverride(new A.MasterColorMapping())
        ) { Type = SlideLayoutValues.Blank };
    }

    /// <summary>
    /// Creates a slide with proper background, shape tree, and ColorMapOverride.
    /// </summary>
    private Slide CreateSlideBase(A.SchemeColorValues bgColor, string groupName, bool showMasterShapes = true)
    {
        var slide = new Slide(
            new CommonSlideData(
                new Background(new BackgroundProperties(
                    new A.SolidFill(new A.SchemeColor { Val = bgColor }),
                    new A.EffectList()
                )),
                new ShapeTree(
                    new NonVisualGroupShapeProperties(
                        new NonVisualDrawingProperties { Id = 1U, Name = "" },
                        new NonVisualGroupShapeDrawingProperties(),
                        new ApplicationNonVisualDrawingProperties()),
                    new GroupShapeProperties()
                )
            ),
            new ColorMapOverride(new A.MasterColorMapping())
        );
        if (!showMasterShapes) slide.ShowMasterShapes = false;
        return slide;
    }

    private void CreateTitleSlide(SlidePart slidePart, string title, string subtitle, WorkflowResult result)
    {
        var slide = CreateSlideBase(A.SchemeColorValues.Accent1, "TitleGroup");

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 914400, 1828800, 8229600, 1200000, "FINABEO", 6000, A.SchemeColorValues.Light1, true));
        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(3, 914400, 3200000, 8229600, 2000000, title, 4400, A.SchemeColorValues.Light1, false));
        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(4, 914400, 5943600, 8229600, 685800, DateTime.UtcNow.ToString("MMMM dd, yyyy"), 2400, A.SchemeColorValues.Accent4, false));

        slidePart.Slide = slide;
    }

    private void CreateMarketInsightsSlide(SlidePart slidePart, MarketAnalysis? analysis)
    {
        var slide = CreateSlideBase(A.SchemeColorValues.Light1, "InsightsGroup", showMasterShapes: false);

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 457200, 274638, 8763600, 914400, "Market Insights & Trends", 4400, A.SchemeColorValues.Accent1, true));

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
        var slide = CreateSlideBase(A.SchemeColorValues.Light1, "AlignmentGroup", showMasterShapes: false);

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 457200, 274638, 8763600, 914400, "Finabeo Service Alignment", 4400, A.SchemeColorValues.Accent1, true));

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
        var slide = CreateSlideBase(A.SchemeColorValues.Light1, "StrategyGroup", showMasterShapes: false);

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 457200, 274638, 8763600, 914400, "Go-to-Market Strategy", 4400, A.SchemeColorValues.Accent1, true));

        var strategyText = $"Target Focus:\n• {result.ServiceAlignment?.RecommendedFocus ?? "Enterprise reach"}\n\nKey Themes:\n• {string.Join("\n• ", result.ServiceAlignment?.ContentThemes?.Take(4) ?? new List<string>())}\n\nEngagement Rule:\n• Lead with FinOps ROI to fund Agentic AI pilots.";
        slide.CommonSlideData!.ShapeTree!.Append(CreateTextShape(3, 457200, 1371600, 8763600, 4500000, strategyText, 1800, A.SchemeColorValues.Dark1, false));

        slidePart.Slide = slide;
    }

    private DocumentFormat.OpenXml.Presentation.Shape CreateTextShape(uint id, long x, long y, long width, long height, string text, int fontSize, A.SchemeColorValues color, bool isBold = false)
    {
        // Use txBox="1" for text boxes (NOT spLocks/noGrp which is for placeholders)
        var nvSpPr = new NonVisualShapeProperties(
            new NonVisualDrawingProperties { Id = id, Name = "TextBox " + id },
            new NonVisualShapeDrawingProperties { TextBox = true },
            new ApplicationNonVisualDrawingProperties()
        );

        var shape = new DocumentFormat.OpenXml.Presentation.Shape(
            nvSpPr,
            new ShapeProperties(
                new A.Transform2D(new A.Offset { X = x, Y = y }, new A.Extents { Cx = width, Cy = height }),
                new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle },
                new A.NoFill()
            ),
            new TextBody(
                new A.BodyProperties(new A.ShapeAutoFit()) { Wrap = A.TextWrappingValues.Square },
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
                new A.ParagraphProperties(
                    new A.DefaultRunProperties { Language = "en-US", FontSize = fontSize }
                ),
                new A.Run(rPr, new A.Text(line))
            );
            paragraph.Append(new A.EndParagraphRunProperties { Language = "en-US" });
            shape.TextBody!.Append(paragraph);
        }
        return shape;
    }

    private DefaultTextStyle CreateDefaultTextStyle()
    {
        var defaultTextStyle = new DefaultTextStyle();
        defaultTextStyle.Append(new A.DefaultParagraphProperties(
            new A.DefaultRunProperties { Language = "en-US" }
        ));

        for (int level = 1; level <= 5; level++)
        {
            int marginLeft = (level - 1) * 457200;
            var levelProps = new A.DefaultRunProperties(
                new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Text1 }),
                new A.LatinFont { Typeface = "+mn-lt" },
                new A.EastAsianFont { Typeface = "+mn-ea" },
                new A.ComplexScriptFont { Typeface = "+mn-cs" }
            ) { FontSize = 1800, Kerning = 1200 };

            OpenXmlElement paragraphProps = level switch
            {
                1 => new A.Level1ParagraphProperties(levelProps) { MarginLeft = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                2 => new A.Level2ParagraphProperties(levelProps) { MarginLeft = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                3 => new A.Level3ParagraphProperties(levelProps) { MarginLeft = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                4 => new A.Level4ParagraphProperties(levelProps) { MarginLeft = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                _ => new A.Level5ParagraphProperties(levelProps) { MarginLeft = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
            };
            defaultTextStyle.Append(paragraphProps);
        }
        return defaultTextStyle;
    }

    private A.Theme CreateTheme()
    {
        var themeElements = new A.ThemeElements(
            new A.ColorScheme(
                new A.Dark1Color(new A.SystemColor { Val = A.SystemColorValues.WindowText, LastColor = "000000" }),
                new A.Light1Color(new A.SystemColor { Val = A.SystemColorValues.Window, LastColor = "FFFFFF" }),
                new A.Dark2Color(new A.RgbColorModelHex { Val = "1F4E78" }),
                new A.Light2Color(new A.RgbColorModelHex { Val = "E7E6E6" }),
                new A.Accent1Color(new A.RgbColorModelHex { Val = "003366" }),
                new A.Accent2Color(new A.RgbColorModelHex { Val = "00B4D8" }),
                new A.Accent3Color(new A.RgbColorModelHex { Val = "FFB81C" }),
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
                            new A.GradientStop(new A.SchemeColor(new A.Tint { Val = 50000 }, new A.SaturationModulation { Val = 300000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 0 },
                            new A.GradientStop(new A.SchemeColor(new A.Tint { Val = 37000 }, new A.SaturationModulation { Val = 300000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 35000 },
                            new A.GradientStop(new A.SchemeColor(new A.Tint { Val = 15000 }, new A.SaturationModulation { Val = 350000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 100000 }
                        ),
                        new A.LinearGradientFill { Angle = 16200000, Scaled = true }
                    ) { RotateWithShape = true },
                    new A.GradientFill(
                        new A.GradientStopList(
                            new A.GradientStop(new A.SchemeColor(new A.Shade { Val = 51000 }, new A.SaturationModulation { Val = 130000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 0 },
                            new A.GradientStop(new A.SchemeColor(new A.Shade { Val = 93000 }, new A.SaturationModulation { Val = 130000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 80000 },
                            new A.GradientStop(new A.SchemeColor(new A.Shade { Val = 94000 }, new A.SaturationModulation { Val = 135000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 100000 }
                        ),
                        new A.LinearGradientFill { Angle = 16200000, Scaled = false }
                    ) { RotateWithShape = true }
                ),
                new A.LineStyleList(
                    new A.Outline(
                        new A.SolidFill(new A.SchemeColor(new A.Shade { Val = 95000 }, new A.SaturationModulation { Val = 105000 }) { Val = A.SchemeColorValues.PhColor }),
                        new A.PresetDash { Val = A.PresetLineDashValues.Solid }
                    ) { Width = 9525, CapType = A.LineCapValues.Flat, CompoundLineType = A.CompoundLineValues.Single, Alignment = A.PenAlignmentValues.Center },
                    new A.Outline(
                        new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }),
                        new A.PresetDash { Val = A.PresetLineDashValues.Solid }
                    ) { Width = 25400, CapType = A.LineCapValues.Flat, CompoundLineType = A.CompoundLineValues.Single, Alignment = A.PenAlignmentValues.Center },
                    new A.Outline(
                        new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }),
                        new A.PresetDash { Val = A.PresetLineDashValues.Solid }
                    ) { Width = 38100, CapType = A.LineCapValues.Flat, CompoundLineType = A.CompoundLineValues.Single, Alignment = A.PenAlignmentValues.Center }
                ),
                new A.EffectStyleList(
                    new A.EffectStyle(new A.EffectList()),
                    new A.EffectStyle(new A.EffectList()),
                    new A.EffectStyle(new A.EffectList(
                        new A.OuterShadow(
                            new A.RgbColorModelHex(new A.Alpha { Val = 35000 }) { Val = "000000" }
                        ) { BlurRadius = 40000L, Distance = 23000L, Direction = 5400000, RotateWithShape = false }
                    ))
                ),
                new A.BackgroundFillStyleList(
                    new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.PhColor }),
                    new A.GradientFill(
                        new A.GradientStopList(
                            new A.GradientStop(new A.SchemeColor(new A.Tint { Val = 40000 }, new A.SaturationModulation { Val = 350000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 0 },
                            new A.GradientStop(new A.SchemeColor(new A.Tint { Val = 45000 }, new A.Shade { Val = 99000 }, new A.SaturationModulation { Val = 350000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 40000 },
                            new A.GradientStop(new A.SchemeColor(new A.Shade { Val = 20000 }, new A.SaturationModulation { Val = 255000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 100000 }
                        ),
                        new A.PathGradientFill(
                            new A.FillToRectangle { Left = 50000, Top = -80000, Right = 50000, Bottom = 180000 }
                        ) { Path = A.PathShadeValues.Circle }
                    ) { RotateWithShape = true },
                    new A.GradientFill(
                        new A.GradientStopList(
                            new A.GradientStop(new A.SchemeColor(new A.Tint { Val = 80000 }, new A.SaturationModulation { Val = 300000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 0 },
                            new A.GradientStop(new A.SchemeColor(new A.Shade { Val = 30000 }, new A.SaturationModulation { Val = 200000 }) { Val = A.SchemeColorValues.PhColor }) { Position = 100000 }
                        ),
                        new A.PathGradientFill(
                            new A.FillToRectangle { Left = 50000, Top = 50000, Right = 50000, Bottom = 50000 }
                        ) { Path = A.PathShadeValues.Circle }
                    ) { RotateWithShape = true }
                )
            ) { Name = "Finabeo Format" }
        );

        return new A.Theme(
            themeElements,
            new A.ObjectDefaults(),
            new A.ExtraColorSchemeList()
        ) { Name = "Finabeo Standard" };
    }
}
