using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Presentation;
using A = DocumentFormat.OpenXml.Drawing;
using FinabeoMarketingAgent.Branding;
using FinabeoMarketingAgent.Models;
using FinabeoMarketingAgent.Workflow;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Formatters;

/// <summary>
/// Generates branded PowerPoint presentations with robust structure to avoid repair errors.
///
/// Branding is supplied via <see cref="BrandingTheme"/> loaded from the company's branding JSON
/// (e.g. finabeo-branding.json, brigade-electronics-branding.json). All colours, fonts, and
/// text strings come from the theme — nothing Finabeo-specific is hardcoded.
///
/// Structural requirements for valid PPTX (see openxml-pptx-csharp skill / structural-checklist.md):
/// 1. Theme linked from BOTH the presentation level AND slide master
/// 2. TableStylesPart present even if empty
/// 3. Presentation includes defaultTextStyle with 5 paragraph levels
/// 4. Text boxes use cNvSpPr txBox="1", NOT spLocks/noGrp
/// 5. All slides include ColorMapOverride
/// 6. PresetGeometry contains AdjustValueList
/// 7. BackgroundProperties contains EffectList
/// 8. Slide master uses BackgroundStyleReference (not BackgroundProperties)
/// 9. Theme includes ObjectDefaults + ExtraColorSchemeList + full format scheme with gradients
/// 10. NormalViewProperties has RestoredLeft and RestoredTop
/// </summary>
public class PowerPointContentFormatter
{
    private readonly BrandingTheme _theme;
    private readonly ILogger<PowerPointContentFormatter> _logger;

    public PowerPointContentFormatter(string brandingConfigPath, ILogger<PowerPointContentFormatter> logger)
    {
        _logger = logger;
        try
        {
            _theme = BrandingTheme.LoadFromFile(brandingConfigPath);
            _logger.LogInformation("✓ PowerPoint branding loaded for {Company}", _theme.CompanyName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠ Could not load branding from {Path}; using defaults", brandingConfigPath);
            _theme = new BrandingTheme();
        }
    }

    public async Task<string> GenerateMarketAnalysisDeckAsync(WorkflowResult workflowResult)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
        var fileName = $"output/{_theme.FilenameSlug}-market-deck-{timestamp}.pptx";

        Directory.CreateDirectory(Path.GetDirectoryName(fileName) ?? "output");

        try
        {
            using (var presentationDocument = PresentationDocument.Create(fileName, PresentationDocumentType.Presentation))
            {
                var presentationPart = presentationDocument.AddPresentationPart();

                // [Skill rule 1] Theme created on PresentationPart FIRST, then shared with slide master
                var themePart = presentationPart.AddNewPart<ThemePart>();
                themePart.Theme = CreateTheme();

                // [Skill rule 2] TableStylesPart required even with no tables
                var tableStylesPart = presentationPart.AddNewPart<TableStylesPart>();
                tableStylesPart.TableStyleList = new A.TableStyleList { Default = "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}" };

                // Slide master shares the SAME theme part (don't create a second one)
                var slideMasterPart = presentationPart.AddNewPart<SlideMasterPart>();
                slideMasterPart.AddPart(themePart);
                InitSlideMasterPart(slideMasterPart);

                var slideLayoutPart = slideMasterPart.AddNewPart<SlideLayoutPart>();
                InitSlideLayoutPart(slideLayoutPart);
                slideLayoutPart.AddPart(slideMasterPart);

                slideMasterPart.SlideMaster.SlideLayoutIdList!.Append(new SlideLayoutId
                {
                    Id = 2147483649U,
                    RelationshipId = slideMasterPart.GetIdOfPart(slideLayoutPart)
                });

                // [Skill rule 3] DefaultTextStyle in <p:presentation>, schema order matters
                var presentation = new Presentation();
                presentation.Append(new SlideMasterIdList(
                    new SlideMasterId { Id = 2147483648U, RelationshipId = presentationPart.GetIdOfPart(slideMasterPart) }
                ));
                presentation.Append(new SlideIdList());
                presentation.Append(new SlideSize { Cx = 12192000, Cy = 6858000, Type = SlideSizeValues.Screen16x9 });
                presentation.Append(new NotesSize { Cx = 6858000, Cy = 9144000 });
                presentation.Append(CreateDefaultTextStyle());
                presentationPart.Presentation = presentation;

                // [Skill rule 10] ViewProperties needs NormalViewProperties with RestoredLeft/Top
                var viewPropsPart = presentationPart.AddNewPart<ViewPropertiesPart>();
                viewPropsPart.ViewProperties = new ViewProperties(
                    new NormalViewProperties(
                        new RestoredLeft { Size = 15620 },
                        new RestoredTop { Size = 94660 }
                    )
                );

                var presPropsPart = presentationPart.AddNewPart<PresentationPropertiesPart>();
                presPropsPart.PresentationProperties = new PresentationProperties();

                // ─── Slides (each routed through CreateSlideBase which adds ColorMapOverride) ───
                AddSlide(presentationPart, slideLayoutPart, 0, (part) =>
                    CreateTitleSlide(part, $"{_theme.CompanyName}: Market-Service Alignment", "Executive Strategy Brief"));

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
                _logger.LogInformation("✓ PowerPoint presentation created: {File}", fileName);
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
        // [Skill rule 8] Slide master uses BackgroundStyleReference (NOT BackgroundProperties)
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
                            new A.LatinFont { Typeface = _theme.HeadingFont }
                        ) { Language = "en-US", FontSize = 4400 }
                    ) { Alignment = A.TextAlignmentTypeValues.Left }
                ),
                new BodyStyle(
                    new A.Level1ParagraphProperties(
                        new A.DefaultRunProperties(
                            new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Text1 }),
                            new A.LatinFont { Typeface = _theme.BodyFont }
                        ) { Language = "en-US", FontSize = 1800 }
                    ) { LeftMargin = 342900, Indent = -342900, Alignment = A.TextAlignmentTypeValues.Left }
                ),
                new OtherStyle(
                    new A.Level1ParagraphProperties(
                        new A.DefaultRunProperties(
                            new A.SolidFill(new A.SchemeColor { Val = A.SchemeColorValues.Text1 }),
                            new A.LatinFont { Typeface = _theme.BodyFont }
                        ) { Language = "en-US", FontSize = 1200 }
                    )
                )
            )
        );
        slideMasterPart.SlideMaster = slideMaster;
    }

    private void InitSlideLayoutPart(SlideLayoutPart layoutPart)
    {
        // [Skill rule 5] ColorMapOverride on the layout too
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
    /// Background can be either a scheme color (e.g. Light1 for white content slides)
    /// or a literal RGB hex (used for the title slide where the brand background is needed).
    /// </summary>
    private Slide CreateSlideBase(string? backgroundHex, A.SchemeColorValues? backgroundScheme, bool showMasterShapes = true)
    {
        // Build the background fill — prefer literal RGB if provided, else fall back to scheme color.
        // Both paths must be followed by EffectList per [Skill rule 7].
        A.SolidFill bgFill = backgroundHex is not null
            ? new A.SolidFill(new A.RgbColorModelHex { Val = backgroundHex })
            : new A.SolidFill(new A.SchemeColor { Val = backgroundScheme ?? A.SchemeColorValues.Light1 });

        var slide = new Slide(
            new CommonSlideData(
                new Background(new BackgroundProperties(
                    bgFill,
                    new A.EffectList()  // [Skill rule 7]
                )),
                new ShapeTree(
                    new NonVisualGroupShapeProperties(
                        new NonVisualDrawingProperties { Id = 1U, Name = "" },
                        new NonVisualGroupShapeDrawingProperties(),
                        new ApplicationNonVisualDrawingProperties()),
                    new GroupShapeProperties()
                )
            ),
            new ColorMapOverride(new A.MasterColorMapping())  // [Skill rule 5] required on every slide
        );
        if (!showMasterShapes) slide.ShowMasterShapes = false;
        return slide;
    }

    private void CreateTitleSlide(SlidePart slidePart, string title, string subtitle)
    {
        // Title slide uses the brand-specified background colour from the JSON
        // (Finabeo: navy; Brigade: industrial black) so light text always has good contrast.
        var slide = CreateSlideBase(_theme.PptTitleSlideBackgroundHex, backgroundScheme: null);

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 914400, 1828800, 8229600, 1200000,
                _theme.BrandUppercase, 6000, _theme.PptTitleSlideTextHex, isBold: true, fontFamily: _theme.HeadingFont));

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(3, 914400, 3200000, 8229600, 2000000,
                title, 4400, _theme.PptTitleSlideTextHex, isBold: false, fontFamily: _theme.HeadingFont));

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(4, 914400, 5943600, 8229600, 685800,
                $"{subtitle} · {DateTime.UtcNow:MMMM dd, yyyy}", 2400, _theme.AccentHex, isBold: false, fontFamily: _theme.BodyFont));

        slidePart.Slide = slide;
    }

    private void CreateMarketInsightsSlide(SlidePart slidePart, MarketAnalysis? analysis)
    {
        var slide = CreateSlideBase(backgroundHex: null, backgroundScheme: A.SchemeColorValues.Light1, showMasterShapes: false);

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 457200, 274638, 8763600, 914400,
                "Market Insights & Trends", 4400, _theme.PptHeadingColorHex, isBold: true, fontFamily: _theme.HeadingFont));

        var yPosition = 1300000;
        uint shapeId = 3;
        if (analysis?.MarketInsights != null)
        {
            foreach (var insight in analysis.MarketInsights.Take(2))
            {
                var text = $"Trend: {insight.Trend}\n\nPain: {insight.PainPoint}\n\nOpportunity: {insight.OpportunityDescription}";
                slide.CommonSlideData!.ShapeTree!.Append(
                    CreateTextShape(shapeId++, 457200, yPosition, 8763600, 2400000,
                        text, 1600, _theme.PptBodyColorHex, isBold: false, fontFamily: _theme.BodyFont));
                yPosition += 2600000;
            }
        }
        slidePart.Slide = slide;
    }

    private void CreateServiceAlignmentSlide(SlidePart slidePart, ServiceAlignment? alignment)
    {
        var slide = CreateSlideBase(backgroundHex: null, backgroundScheme: A.SchemeColorValues.Light1, showMasterShapes: false);

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 457200, 274638, 8763600, 914400,
                $"{_theme.CompanyName} Service Alignment", 4400, _theme.PptHeadingColorHex, isBold: true, fontFamily: _theme.HeadingFont));

        var yPosition = 1300000;
        uint shapeId = 3;
        if (alignment?.FinabeoServices != null)
        {
            foreach (var service in alignment.FinabeoServices)
            {
                var text = $"Item: {service.ServiceName} ({service.AlignmentScore * 100:F0}% Fit)\n\n{service.WhyFit}\n\nKey Benefits:\n• {string.Join("\n• ", service.KeyBenefitsToHighlight ?? new List<string>())}";
                slide.CommonSlideData!.ShapeTree!.Append(
                    CreateTextShape(shapeId++, 457200, yPosition, 8763600, 2600000,
                        text, 1500, _theme.PptBodyColorHex, isBold: false, fontFamily: _theme.BodyFont));
                yPosition += 2800000;
            }
        }
        slidePart.Slide = slide;
    }

    private void CreateStrategySlide(SlidePart slidePart, WorkflowResult result)
    {
        var slide = CreateSlideBase(backgroundHex: null, backgroundScheme: A.SchemeColorValues.Light1, showMasterShapes: false);

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(2, 457200, 274638, 8763600, 914400,
                "Go-to-Market Strategy", 4400, _theme.PptHeadingColorHex, isBold: true, fontFamily: _theme.HeadingFont));

        var strategyText = $"Recommended Focus:\n• {result.ServiceAlignment?.RecommendedFocus ?? "Lead with the highest-fit service this week"}\n\n" +
                           $"Key Themes:\n• {string.Join("\n• ", result.ServiceAlignment?.ContentThemes?.Take(4) ?? new List<string>())}";

        slide.CommonSlideData!.ShapeTree!.Append(
            CreateTextShape(3, 457200, 1371600, 8763600, 4500000,
                strategyText, 1800, _theme.PptBodyColorHex, isBold: false, fontFamily: _theme.BodyFont));

        slidePart.Slide = slide;
    }

    /// <summary>
    /// Create a text box shape using literal RGB color (not scheme color).
    /// [Skill rule 4] uses TextBox=true (NOT spLocks/noGrp).
    /// [Skill rule 6] PresetGeometry includes AdjustValueList.
    /// </summary>
    private DocumentFormat.OpenXml.Presentation.Shape CreateTextShape(
        uint id, long x, long y, long width, long height,
        string text, int fontSize, string colorHex, bool isBold = false, string? fontFamily = null)
    {
        var nvSpPr = new NonVisualShapeProperties(
            new NonVisualDrawingProperties { Id = id, Name = "TextBox " + id },
            new NonVisualShapeDrawingProperties { TextBox = true },  // [Skill rule 4]
            new ApplicationNonVisualDrawingProperties()
        );

        var shape = new DocumentFormat.OpenXml.Presentation.Shape(
            nvSpPr,
            new ShapeProperties(
                new A.Transform2D(new A.Offset { X = x, Y = y }, new A.Extents { Cx = width, Cy = height }),
                new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle },  // [Skill rule 6]
                new A.NoFill()
            ),
            new TextBody(
                new A.BodyProperties(new A.ShapeAutoFit()) { Wrap = A.TextWrappingValues.Square },
                new A.ListStyle()
            )
        );

        var resolvedFont = fontFamily ?? _theme.BodyFont;
        foreach (var originalLine in text.Split('\n'))
        {
            var line = string.IsNullOrWhiteSpace(originalLine) ? " " : originalLine;
            var rPr = new A.RunProperties { Language = "en-US", FontSize = fontSize };
            if (isBold) rPr.Bold = true;
            rPr.Append(new A.SolidFill(new A.RgbColorModelHex { Val = colorHex }));
            rPr.Append(new A.LatinFont { Typeface = resolvedFont });

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

    /// <summary>[Skill rule 3] DefaultTextStyle with 5 paragraph levels in correct order</summary>
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
                1 => new A.Level1ParagraphProperties(levelProps) { LeftMargin = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                2 => new A.Level2ParagraphProperties(levelProps) { LeftMargin = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                3 => new A.Level3ParagraphProperties(levelProps) { LeftMargin = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                4 => new A.Level4ParagraphProperties(levelProps) { LeftMargin = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
                _ => new A.Level5ParagraphProperties(levelProps) { LeftMargin = marginLeft, Alignment = A.TextAlignmentTypeValues.Left, DefaultTabSize = 457200, RightToLeft = false, EastAsianLineBreak = true, LatinLineBreak = false, Height = true },
            };
            defaultTextStyle.Append(paragraphProps);
        }
        return defaultTextStyle;
    }

    /// <summary>
    /// Build the theme using the company's brand colours as Accent1/Accent2/Accent3.
    /// [Skill rule 9] includes ObjectDefaults, ExtraColorSchemeList, and the full Office-standard
    /// format scheme (gradient fills with tint/shade/satMod transforms — bare phClr would trigger Repair).
    /// </summary>
    private A.Theme CreateTheme()
    {
        var themeElements = new A.ThemeElements(
            new A.ColorScheme(
                new A.Dark1Color(new A.SystemColor { Val = A.SystemColorValues.WindowText, LastColor = "000000" }),
                new A.Light1Color(new A.SystemColor { Val = A.SystemColorValues.Window, LastColor = "FFFFFF" }),
                new A.Dark2Color(new A.RgbColorModelHex { Val = "1F4E78" }),
                new A.Light2Color(new A.RgbColorModelHex { Val = "E7E6E6" }),
                new A.Accent1Color(new A.RgbColorModelHex { Val = _theme.PrimaryHex }),
                new A.Accent2Color(new A.RgbColorModelHex { Val = _theme.SecondaryHex }),
                new A.Accent3Color(new A.RgbColorModelHex { Val = _theme.AccentHex }),
                new A.Accent4Color(new A.RgbColorModelHex { Val = "A5A5A5" }),
                new A.Accent5Color(new A.RgbColorModelHex { Val = "264478" }),
                new A.Accent6Color(new A.RgbColorModelHex { Val = "7E9CC5" }),
                new A.Hyperlink(new A.RgbColorModelHex { Val = "0563C1" }),
                new A.FollowedHyperlinkColor(new A.RgbColorModelHex { Val = "954F72" })
            ) { Name = $"{_theme.CompanyName} Office" },
            new A.FontScheme(
                new A.MajorFont(new A.LatinFont { Typeface = _theme.HeadingFont }, new A.EastAsianFont { Typeface = "" }, new A.ComplexScriptFont { Typeface = "" }),
                new A.MinorFont(new A.LatinFont { Typeface = _theme.BodyFont }, new A.EastAsianFont { Typeface = "" }, new A.ComplexScriptFont { Typeface = "" })
            ) { Name = $"{_theme.CompanyName} Fonts" },
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
            ) { Name = $"{_theme.CompanyName} Format" }
        );

        // [Skill rule 9] ObjectDefaults + ExtraColorSchemeList both required
        return new A.Theme(
            themeElements,
            new A.ObjectDefaults(),
            new A.ExtraColorSchemeList()
        ) { Name = $"{_theme.CompanyName} Standard" };
    }
}
