using Azure.AI.Projects;
using Azure.Identity;
using FinabeoMarketingAgent.Agents;
using FinabeoMarketingAgent.Config;
using FinabeoMarketingAgent.Workflow;
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
var finabeoServices = config.GetSection("FinabeoServices").Get<List<FinabeoService>>() ?? new();

if (foundryConfig == null || !foundryConfig.IsValid)
{
    Console.Error.WriteLine("ERROR: Invalid Foundry configuration. Check appsettings.json");
    Environment.Exit(1);
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
        new AzureKeyCredential(foundryConfig.ApiKey));

    // Get chat client for GPT-4o
    var chatClient = client.GetChatClient("gpt-4o");

    logger.LogInformation("✓ Connected to Foundry");
    logger.LogInformation($"✓ Loaded {finabeoServices.Count} Finabeo services\n");

    // Create agents
    var agentLogger = serviceProvider.GetRequiredService<ILogger<MarketResearchAgent>>();
    var researchAgent = new MarketResearchAgent(chatClient, agentLogger);

    var alignmentLogger = serviceProvider.GetRequiredService<ILogger<FinabeoAlignmentAgent>>();
    var alignmentAgent = new FinabeoAlignmentAgent(chatClient, finabeoServices, alignmentLogger);

    var contentLogger = serviceProvider.GetRequiredService<ILogger<ContentGenerationAgent>>();
    var contentAgent = new ContentGenerationAgent(chatClient, contentLogger);

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
