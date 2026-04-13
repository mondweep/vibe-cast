using Azure.Identity;
using Azure.Storage.Blobs;
using FinabeoMarketingAgent.Functions;
using FinabeoMarketingAgent.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration((context, config) =>
    {
        config.AddEnvironmentVariables();
    })
    .ConfigureServices((context, services) =>
    {
        var configuration = context.Configuration;

        // Register Azure Blob Storage client using Managed Identity
        services.AddSingleton(sp =>
        {
            var storageEndpoint = configuration["AzureStorage:BlobEndpoint"];
            if (!string.IsNullOrEmpty(storageEndpoint))
            {
                return new BlobServiceClient(new Uri(storageEndpoint), new DefaultAzureCredential());
            }

            // Fallback to connection string for local development
            var connectionString = configuration["AzureWebJobsStorage"];
            return new BlobServiceClient(connectionString);
        });

        // Register output uploader service
        services.AddSingleton<IOutputUploader, BlobOutputUploader>();

        // Register workflow factory (creates workflow instances with Foundry client)
        services.AddSingleton<IWorkflowFactory, WorkflowFactory>();

        // Register function classes that are injected into other functions
        services.AddSingleton<DailyMarketingWorkflow>();

        services.AddLogging(builder =>
        {
            builder.SetMinimumLevel(LogLevel.Information);
        });
    })
    .Build();

host.Run();
