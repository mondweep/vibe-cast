using Azure.AI.Projects;
using Azure;
using Azure.Identity;
using System.ClientModel;
using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Workflow;
using FinabeoMarketingAgent.Formatters;
using Microsoft.Agents.AI.Foundry;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Serialization;

// Load configuration
var config = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: false)
    .Build();

var foundryConfig = config.GetSection("Foundry").Get<FoundryConfig>();

if (foundryConfig == null || !foundryConfig.IsValid)
{
    Console.Error.WriteLine("ERROR: Invalid Foundry configuration. Check appsettings.json");
    Environment.Exit(1);
}

// Console host runs Finabeo by default; pass a different companyId via CLI arg (e.g. `dotnet run -- brigade-electronics`)
var companyId = args.Length > 0 ? args[0] : "finabeo";

var companyRegistry = CompanyRegistry.LoadFromFile(CompanyRegistry.ResolveDefaultConfigPath());
if (!companyRegistry.TryGet(companyId, out var company) || company is null)
{
    Console.Error.WriteLine($"ERROR: Unknown companyId '{companyId}'. Known: {string.Join(", ", companyRegistry.All.Select(c => c.Id))}");
    Environment.Exit(1);
    return;
}

Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
Console.WriteLine("║      Finabeo Marketing Agent - Multi-Agent Workflow       ║");
Console.WriteLine("╚════════════════════════════════════════════════════════════╝\n");

// Set up dependency injection
var services = new ServiceCollection()
    .AddLogging(builder =>
    {
        builder.AddConsole();
        builder.SetMinimumLevel(LogLevel.Information);
    });

var serviceProvider = services.BuildServiceProvider();
var logger = serviceProvider.GetRequiredService<ILogger<Program>>();

try
{
    logger.LogInformation($"Connecting to Foundry: {foundryConfig.Endpoint}");

    // Create Foundry client
    var client = new AIProjectClient(
        new Uri(foundryConfig.Endpoint),
        new DefaultAzureCredential());

    // Get chat client for GPT-4o
    var chatClient = client.ProjectOpenAIClient.GetChatClient("gpt-4o").AsIChatClient();

    logger.LogInformation("✓ Connected to Foundry");
    logger.LogInformation("✓ Running for {Company} ({ServiceCount} services in catalogue)\n",
        company.Name, company.Services.Count);

    // Create agents
    var agentLogger = serviceProvider.GetRequiredService<ILogger<MarketResearchAgent>>();
    var researchAgent = new MarketResearchAgent(chatClient, company, agentLogger);

    var alignmentLogger = serviceProvider.GetRequiredService<ILogger<ServiceAlignmentAgent>>();
    var alignmentAgent = new ServiceAlignmentAgent(chatClient, company, alignmentLogger);

    var contentLogger = serviceProvider.GetRequiredService<ILogger<ContentGenerationAgent>>();
    var contentAgent = new ContentGenerationAgent(chatClient, company, contentLogger);

    // Create and execute workflow
    var workflowLogger = serviceProvider.GetRequiredService<ILogger<MarketingWorkflow>>();
    var workflow = new MarketingWorkflow(researchAgent, alignmentAgent, contentAgent, workflowLogger);

    Console.WriteLine("🚀 Starting workflow execution...\n");

    var result = await workflow.ExecuteAsync();

    Console.WriteLine($"\n✅ Workflow Status: {result.Status}");
    Console.WriteLine($"⏱️  Duration: {result.Duration.TotalSeconds:F2} seconds\n");

    // Save results to file
    var outputDir = Path.Combine(Directory.GetCurrentDirectory(), "output");
    Directory.CreateDirectory(outputDir);

    var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd-HHmmss");
    var outputPath = Path.Combine(outputDir, $"marketing-content-{timestamp}.json");

    var options = new JsonSerializerOptions
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    var jsonContent = JsonSerializer.Serialize(result, options);
    await File.WriteAllTextAsync(outputPath, jsonContent);

    Console.WriteLine($"📁 Output saved to: {outputPath}\n");

    // Generate branded outputs (Word, PowerPoint, Images)
    Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║           Generating Branded Content Formats              ║");
    Console.WriteLine("╚════════════════════════════════════════════════════════════╝\n");

    var brandingFile = string.IsNullOrEmpty(company.BrandingFile) ? "finabeo-branding.json" : company.BrandingFile;
    var brandingConfigPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "branding", brandingFile);
    if (!File.Exists(brandingConfigPath))
    {
        // Fall back to Finabeo branding if the company-specific file is missing
        brandingConfigPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "branding", "finabeo-branding.json");
        logger.LogWarning("Branding file '{File}' not found for {Company}; falling back to Finabeo branding",
            brandingFile, company.Name);
    }
    var wordFormatterLogger = serviceProvider.GetRequiredService<ILogger<WordContentFormatter>>();
    var wordFormatter = new WordContentFormatter(brandingConfigPath, wordFormatterLogger);

    var powerpointFormatterLogger = serviceProvider.GetRequiredService<ILogger<PowerPointContentFormatter>>();
    var powerpointFormatter = new PowerPointContentFormatter(brandingConfigPath, powerpointFormatterLogger);

    var imageFormatterLogger = serviceProvider.GetRequiredService<ILogger<ImageContentFormatter>>();
    var imageFormatter = new ImageContentFormatter(foundryConfig.Endpoint, foundryConfig.ApiKey, imageFormatterLogger);

    try
    {
        // Generate Word documents
        Console.WriteLine("\n📄 Generating Word Documents...");
        var blogDocPath = await wordFormatter.GenerateBlogDocumentAsync(result);
        Console.WriteLine($"✓ Blog document: {blogDocPath}");

        var marketReportPath = await wordFormatter.GenerateMarketAnalysisReportAsync(result);
        Console.WriteLine($"✓ Market analysis report: {marketReportPath}");

        // Generate PowerPoint presentation
        Console.WriteLine("\n🎨 Generating PowerPoint Presentation...");
        var deckPath = await powerpointFormatter.GenerateMarketAnalysisDeckAsync(result);
        Console.WriteLine($"✓ Market analysis deck: {deckPath}");

        // Generate social media images
        Console.WriteLine("\n🖼️  Generating Social Media Images...");
        if (result.GeneratedContent?.Content?.LinkedIn?.Post != null)
        {
            var linkedinImagePath = await imageFormatter.GenerateLinkedInImageAsync(
                "Microsoft Agent Framework: The CIO's Guide",
                result.GeneratedContent.Content.LinkedIn.Post);
            if (linkedinImagePath != null)
                Console.WriteLine($"✓ LinkedIn image: {linkedinImagePath}");
        }

        if (result.GeneratedContent?.Content?.Instagram?.Caption != null)
        {
            var instagramImagePath = await imageFormatter.GenerateInstagramImageAsync(
                result.GeneratedContent.Content.Instagram.Caption,
                result.GeneratedContent.Content.Instagram.Hashtags ?? new List<string>());
            if (instagramImagePath != null)
                Console.WriteLine($"✓ Instagram image: {instagramImagePath}");
        }

        if (result.GeneratedContent?.Content?.Twitter?.Thread.Count > 0)
        {
            var twitterCardPath = await imageFormatter.GenerateTwitterCardAsync(
                result.GeneratedContent.Content.Twitter.Thread.First().Text);
            if (twitterCardPath != null)
                Console.WriteLine($"✓ Twitter card: {twitterCardPath}");
        }

        if (result.GeneratedContent?.Content?.Blog?.Title != null)
        {
            var blogImagePath = await imageFormatter.GenerateBlogFeaturedImageAsync(
                result.GeneratedContent.Content.Blog.Title);
            if (blogImagePath != null)
                Console.WriteLine($"✓ Blog featured image: {blogImagePath}");
        }

        Console.WriteLine("\n✅ Branded content generation complete!");
    }
    catch (Exception formatEx)
    {
        logger.LogWarning($"⚠ Content formatting warning: {formatEx.Message}");
        Console.WriteLine($"\n⚠ Some content formats could not be generated: {formatEx.Message}");
    }

    // Display summary
    if (result.GeneratedContent != null)
    {
        Console.WriteLine("📊 Generated Content Summary:");
        Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        if (!string.IsNullOrEmpty(result.GeneratedContent.Content.LinkedIn.Post))
        {
            Console.WriteLine("\n📱 LinkedIn Post (first 200 chars):");
            var preview = result.GeneratedContent.Content.LinkedIn.Post.Substring(
                0, Math.Min(200, result.GeneratedContent.Content.LinkedIn.Post.Length));
            Console.WriteLine($"   {preview}...\n");
        }

        if (result.GeneratedContent.Content.Twitter.Thread.Count > 0)
        {
            Console.WriteLine($"🐦 Twitter Thread: {result.GeneratedContent.Content.Twitter.Thread.Count} tweets");
            Console.WriteLine($"   First tweet: {result.GeneratedContent.Content.Twitter.Thread.First().Text.Substring(0, Math.Min(100, result.GeneratedContent.Content.Twitter.Thread.First().Text.Length))}...\n");
        }

        if (!string.IsNullOrEmpty(result.GeneratedContent.Content.Instagram.Caption))
        {
            Console.WriteLine("📸 Instagram Caption (first 150 chars):");
            var preview = result.GeneratedContent.Content.Instagram.Caption.Substring(
                0, Math.Min(150, result.GeneratedContent.Content.Instagram.Caption.Length));
            Console.WriteLine($"   {preview}...\n");
        }

        if (!string.IsNullOrEmpty(result.GeneratedContent.Content.Blog.Title))
        {
            Console.WriteLine("📝 Blog Article:");
            Console.WriteLine($"   Title: {result.GeneratedContent.Content.Blog.Title}");
            Console.WriteLine($"   Word count: {result.GeneratedContent.Content.Blog.WordCount}");
            Console.WriteLine($"   SEO Keywords: {string.Join(", ", result.GeneratedContent.Content.Blog.SeoKeywords.Take(5))}\n");
        }
    }

    Console.WriteLine("╔════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║              ✅ WORKFLOW EXECUTION SUCCESSFUL              ║");
    Console.WriteLine("╚════════════════════════════════════════════════════════════╝");
}
catch (Exception ex)
{
    logger.LogError($"Fatal error: {ex.Message}");
    logger.LogError(ex.StackTrace);
    Console.Error.WriteLine($"\n❌ Error: {ex.Message}");
    Environment.Exit(1);
}
finally
{
    serviceProvider.Dispose();
}
