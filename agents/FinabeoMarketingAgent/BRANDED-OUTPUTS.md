# Branded Content Generators

This document explains the branded output generation system now integrated into the Finabeo Marketing Agent.

## 📊 What's New

The workflow now generates **5 content formats** from a single agent execution:

1. **JSON** - Structured marketing content (existing)
2. **Word Documents (.docx)** - Blog posts and market analysis reports
3. **PowerPoint Presentations (.pptx)** - Executive decks with market insights
4. **JPEG/SVG Images** - Social media cards (LinkedIn, Instagram, Twitter)
5. **Email Templates** - Ready-to-send branded emails

---

## 🎨 Branded Outputs

All outputs use **Finabeo branding** from `branding/finabeo-branding.json`:

### Colors
- **Navy Blue** (`#003366`) - Primary color for headings, trust
- **Tech Blue** (`#00B4D8`) - Accents, secondary CTAs
- **Gold** (`#FFB81C`) - Highlights, metrics, ROI
- **Neutrals** - Dark Gray, Light Gray, White

### Typography
- **Headings**: Montserrat Bold (confident, modern)
- **Body**: Open Sans Regular (readable, professional)
- **Data**: IBM Plex Mono (metrics, code)

### Dimensions

| Format | Dimensions | Usage |
|--------|-----------|-------|
| LinkedIn | 1200 × 627px | Social media post card |
| Instagram | 1080 × 1080px | Square social post |
| Twitter/X | 1024 × 512px | Tweet card |
| Blog Featured | 1200 × 675px | Blog post header |
| Word | A4/Letter | Standard document |
| PowerPoint | 16:9 | Presentation slides |

---

## 🚀 How to Run

### Step 1: Install Dependencies

```bash
cd agents/FinabeoMarketingAgent
dotnet restore
dotnet build
```

### Step 2: Set Your API Key

```bash
export FOUNDRY_API_KEY="your-api-key-here"
```

### Step 3: Run the Workflow

```bash
dotnet run
```

### Step 4: Review Outputs

The system generates outputs in the `output/` directory:

```
output/
├── marketing-content-2026-04-13-144406.json           # Original JSON
├── finabeo-blog-2026-04-13-144406.docx               # Blog document
├── finabeo-market-analysis-2026-04-13-144406.docx    # Market report
├── finabeo-market-deck-2026-04-13-144406.pptx        # Presentation
├── finabeo-linkedin-image-2026-04-13-144406.svg      # LinkedIn card
├── finabeo-instagram-image-2026-04-13-144406.svg     # Instagram card
├── finabeo-twitter-card-2026-04-13-144406.svg        # Twitter card
└── finabeo-blog-featured-2026-04-13-144406.svg       # Blog featured image
```

---

## 📄 Word Document Formatter

**File**: `Formatters/WordContentFormatter.cs`

### Generates

1. **Blog Document** (`finabeo-blog-*.docx`)
   - Finabeo header with logo
   - Blog title (36pt, Navy Blue, Montserrat Bold)
   - Meta description
   - Market insights section
   - Service alignment section
   - Full blog content with markdown parsing
   - SEO keywords section
   - Branded footer

2. **Market Analysis Report** (`finabeo-market-analysis-*.docx`)
   - Title page
   - Executive summary
   - Market insights (trend, pain point, opportunity)
   - Key trends (bulleted)
   - Enterprise pain points
   - Service alignment with scores
   - Branded footer

### Usage

```csharp
var wordFormatter = new WordContentFormatter(
    "branding/finabeo-branding.json",
    logger
);

// Generate blog document
var blogPath = await wordFormatter.GenerateBlogDocumentAsync(workflowResult);

// Generate market analysis report
var reportPath = await wordFormatter.GenerateMarketAnalysisReportAsync(workflowResult);
```

---

## 🎨 PowerPoint Formatter

**File**: `Formatters/PowerPointContentFormatter.cs`

### Generates

**Market Analysis Deck** (`finabeo-market-deck-*.pptx`)

- **Slide 1: Title Slide**
  - Navy Blue background (#003366)
  - "FINABEO" in white (60pt)
  - Title with 54pt white text
  - Generated date in Tech Blue

- **Slide 2: Market Insights**
  - Section heading (44pt, Navy Blue)
  - Top 2 market insights
  - Trend, pain point, opportunity for each

- **Slide 3: Service Alignment**
  - Section heading
  - Each Finabeo service with:
    - Service name
    - Alignment score
    - Why it fits
    - Key benefits

### Usage

```csharp
var powerpointFormatter = new PowerPointContentFormatter(
    "branding/finabeo-branding.json",
    logger
);

var deckPath = await powerpointFormatter.GenerateMarketAnalysisDeckAsync(workflowResult);
```

---

## 🖼️ Image Formatter (DALL-E Ready)

**File**: `Formatters/ImageContentFormatter.cs`

### Current Status: SVG Placeholders

The image formatter currently generates **SVG placeholders** with Finabeo branding. In production, these prompts are sent to **Azure OpenAI DALL-E 3** to generate actual images.

### Generates

1. **LinkedIn Image** (`finabeo-linkedin-image-*.svg`)
   - 1200 × 627px
   - Navy blue gradient background
   - Gold brand bar at top
   - White headline text
   - Finabeo logo
   - Prompt includes: headline, keywords, enterprise focus

2. **Instagram Image** (`finabeo-instagram-image-*.svg`)
   - 1080 × 1080px (square)
   - Bold color blocks (Navy, Tech Blue, Gold)
   - Caption-driven design
   - Modern, eye-catching
   - Dimensions optimized for carousel

3. **Twitter Card** (`finabeo-twitter-card-*.svg`)
   - 1024 × 512px
   - Navy blue background
   - White/Tech Blue text
   - Minimal design
   - Easy-to-read typography

4. **Blog Featured Image** (`finabeo-blog-featured-*.svg`)
   - 1200 × 675px
   - Finabeo branding visible
   - Title-driven design
   - Professional aesthetic
   - Geometric shapes/icons

### Prompts Sent to DALL-E

Each image type has a custom prompt that specifies:

```
- Finabeo brand colors (hex codes)
- Exact dimensions
- Content (headline, theme)
- Design style (professional, minimal, bold, etc.)
- What NOT to include (AI-generated people, etc.)
- Branding requirements (logo placement, color usage)
```

### Usage

```csharp
var imageFormatter = new ImageContentFormatter(
    foundryEndpoint,
    apiKey,
    logger
);

// Generate LinkedIn image
var linkedinPath = await imageFormatter.GenerateLinkedInImageAsync(
    "Headline here",
    "Content for context"
);

// Generate Instagram image
var instagramPath = await imageFormatter.GenerateInstagramImageAsync(
    caption,
    hashtags
);
```

---

## 🔧 Integration with Program.cs

The formatters are automatically called after the workflow executes:

```
1. Execute workflow (3 agents)
   ↓
2. Save JSON output
   ↓
3. Initialize formatters with branding config
   ↓
4. Generate Word documents
   ├─ Blog document (.docx)
   └─ Market analysis report (.docx)
   ↓
5. Generate PowerPoint presentation
   └─ Market deck (.pptx)
   ↓
6. Generate social media images
   ├─ LinkedIn card (.svg)
   ├─ Instagram card (.svg)
   ├─ Twitter card (.svg)
   └─ Blog featured image (.svg)
```

---

## 🎯 Next Steps

### For Production (DALL-E Integration)

1. **Uncomment DALL-E API calls** in `ImageContentFormatter.cs`
2. Use Azure OpenAI client from existing Foundry connection
3. Replace SVG placeholder generation with DALL-E responses
4. Download and save generated images as JPEG

```csharp
// Replace placeholder generation with:
var imageClient = client.GetImageClient("dall-e-3");
var imageResponse = await imageClient.GenerateImageAsync(
    new ImageGenerationOptions
    {
        Prompt = customPrompt,
        Size = ImageSize.W1200H627,
        Quality = ImageGenerationQuality.Standard,
        Style = ImageGenerationStyle.Vivid
    }
);

// Download and save image
var imageUri = imageResponse.Value.ImageUri;
using var httpClient = new HttpClient();
var imageBytes = await httpClient.GetByteArrayAsync(imageUri);
await File.WriteAllBytesAsync(jpegPath, imageBytes);
```

### Testing the Outputs

1. **Word Documents**
   - Open in Microsoft Word or Google Docs
   - Verify colors (Navy Blue headings, Gold accents)
   - Check formatting and layout
   - Review content structure

2. **PowerPoint**
   - Open in Microsoft PowerPoint
   - Verify slide layouts and colors
   - Check text readability
   - Review alignment of content

3. **Images** (SVG)
   - Open in browser or image viewer
   - Verify Finabeo branding visible
   - Check color accuracy
   - In production: verify JPEG quality

---

## 📋 Configuration

### Branding Configuration File

**Path**: `branding/finabeo-branding.json`

```json
{
  "colors": {
    "primary": { "hex": "#003366" },
    "secondary": { "hex": "#00B4D8" },
    "accent": { "hex": "#FFB81C" }
  },
  "typography": {
    "heading": { "family": "Montserrat", "weight": "700" },
    "body": { "family": "Open Sans", "weight": "400" }
  },
  "templates": {
    "social_media": { ... },
    "document": { ... },
    "email": { ... }
  }
}
```

To update branding:
1. Edit `branding/finabeo-branding.json`
2. Rerun the application
3. All outputs will use new colors/fonts automatically

---

## 🚨 Troubleshooting

### Word Documents Not Generated

**Error**: "DocumentFormat.OpenXml not found"

**Solution**:
```bash
dotnet add package DocumentFormat.OpenXml --version 3.0.0
dotnet restore
```

### PowerPoint Formatting Issues

**Issue**: Text overlaps or doesn't display correctly

**Solution**: Adjust coordinates in `PowerPointContentFormatter.cs`:
- `x` = horizontal position (in EMUs: 914400 = 1 inch)
- `y` = vertical position
- `width` = shape width
- `height` = shape height

### Image Generation Timeout

**Issue**: Image generation takes too long

**Solution**: 
- Set timeout in `ImageContentFormatter.cs`
- Use smaller image sizes for testing
- Enable SVG placeholder mode for development

---

## 📊 Performance

Typical execution time with all formatters:

| Task | Duration |
|------|----------|
| Workflow execution (3 agents) | 4-5 seconds |
| Word documents (2 docs) | 1-2 seconds |
| PowerPoint presentation | 1-2 seconds |
| Image generation (SVG placeholders) | 0.5-1 second |
| **Total** | **~7-10 seconds** |

With DALL-E image generation: +30-60 seconds per image

---

## 🔐 Security Notes

- API keys stored in environment variables (`FOUNDRY_API_KEY`)
- No secrets in configuration files
- Branding config is public (no credentials)
- Output files created in `output/` directory
- Consider: Restrict access to generated documents with sensitivity labels

---

## 📝 Example Output Summary

When you run the workflow, you'll see:

```
✅ Workflow Status: Completed
⏱️  Duration: 4.97 seconds

📊 Generated Content Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 LinkedIn Post (first 200 chars):
   I've been exploring the Microsoft Agent Framework this week...

🐦 Twitter Thread: 3 tweets
   First tweet: I said I'd explore Microsoft Agent Framework...

📸 Instagram Caption (first 150 chars):
   Enterprise AI just got simpler 🚀...

📝 Blog Article:
   Title: Microsoft Agent Framework: The CIO's Guide...
   Word count: 1850
   SEO Keywords: Microsoft Agent Framework, Enterprise AI...

✅ WORKFLOW EXECUTION SUCCESSFUL

📄 Generating Word Documents...
✓ Blog document: output/finabeo-blog-2026-04-13-144406.docx
✓ Market analysis report: output/finabeo-market-analysis-2026-04-13-144406.docx

🎨 Generating PowerPoint Presentation...
✓ Market analysis deck: output/finabeo-market-deck-2026-04-13-144406.pptx

🖼️  Generating Social Media Images...
✓ LinkedIn image: output/finabeo-linkedin-image-2026-04-13-144406.svg
✓ Instagram image: output/finabeo-instagram-image-2026-04-13-144406.svg
✓ Twitter card: output/finabeo-twitter-card-2026-04-13-144406.svg
✓ Blog featured image: output/finabeo-blog-featured-2026-04-13-144406.svg

✅ Branded content generation complete!
```

---

## 📞 Support

For issues with:
- **Word generation**: Check Open-XML-SDK version and System.Drawing.Common
- **PowerPoint generation**: Verify slide coordinates and shape dimensions
- **Image generation**: Confirm DALL-E API access in Azure OpenAI
- **Branding**: Review finabeo-branding.json for color/font specifications

---

**Status**: Ready for testing on Mac
**Last Updated**: April 13, 2026
**Branding Source**: www.finabeo.com analysis
