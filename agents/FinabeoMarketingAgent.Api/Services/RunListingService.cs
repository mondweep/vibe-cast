using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using FinabeoMarketingAgent.Config;

namespace FinabeoMarketingAgent.Api.Services;

public record RunFile(string Name, long SizeBytes, string ContentType, string SasUrl, DateTimeOffset LastModified);
public record Run(string RunId, string CompanyId, string CompanyName, DateTimeOffset Timestamp, IReadOnlyList<RunFile> Files);

public class RunListingService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly CompanyRegistry _companyRegistry;
    private readonly string _containerName;
    private readonly ILogger<RunListingService> _logger;

    public RunListingService(
        BlobServiceClient blobServiceClient,
        CompanyRegistry companyRegistry,
        IConfiguration config,
        ILogger<RunListingService> logger)
    {
        _blobServiceClient = blobServiceClient;
        _companyRegistry = companyRegistry;
        _containerName = config["OutputContainer"] ?? "marketing-outputs";
        _logger = logger;
    }

    public async Task<IReadOnlyList<Run>> ListRunsAsync(CancellationToken ct = default)
    {
        var container = _blobServiceClient.GetBlobContainerClient(_containerName);

        // Group files by their {companyId}/{runId} composite key so multiple companies'
        // runs at the same instant don't merge into one Run object.
        var grouped = new Dictionary<string, (string CompanyId, string RunId, List<RunFile> Files)>();

        await foreach (var blob in container.GetBlobsAsync(cancellationToken: ct))
        {
            var (companyId, runId, fileName) = SplitBlobPath(blob.Name);
            if (companyId is null || runId is null || fileName is null) continue;

            var blobClient = container.GetBlobClient(blob.Name);
            var sasUrl = GenerateReadSasUrl(blobClient);

            var file = new RunFile(
                Name: fileName,
                SizeBytes: blob.Properties.ContentLength ?? 0,
                ContentType: blob.Properties.ContentType ?? "application/octet-stream",
                SasUrl: sasUrl,
                LastModified: blob.Properties.LastModified ?? DateTimeOffset.MinValue);

            var key = $"{companyId}/{runId}";
            if (!grouped.TryGetValue(key, out var entry))
            {
                entry = (companyId, runId, new List<RunFile>());
                grouped[key] = entry;
            }
            entry.Files.Add(file);
        }

        return grouped.Values
            .Select(g => new Run(
                RunId: g.RunId,
                CompanyId: g.CompanyId,
                CompanyName: ResolveCompanyName(g.CompanyId),
                Timestamp: ParseRunTimestamp(g.RunId),
                Files: g.Files.OrderBy(f => f.Name).ToList()))
            .OrderByDescending(r => r.Timestamp)
            .ToList();
    }

    /// <summary>
    /// Parse blob names into (companyId, runId, fileName).
    /// New format: "{companyId}/{runId}/{filename}" — e.g. "finabeo/2026-04-14-153704/marketing-content.json"
    /// Legacy format (pre-multi-company): "{runId}/{filename}" — kept readable so old runs still appear.
    /// </summary>
    private static (string? CompanyId, string? RunId, string? FileName) SplitBlobPath(string blobName)
    {
        var parts = blobName.Split('/', 3);

        if (parts.Length == 3)
        {
            // companyId/runId/filename
            return (parts[0], parts[1], parts[2]);
        }

        if (parts.Length == 2)
        {
            // Legacy runId/filename — assume Finabeo since that's all we had before
            return ("finabeo", parts[0], parts[1]);
        }

        return (null, null, null);
    }

    private string ResolveCompanyName(string companyId) =>
        _companyRegistry.TryGet(companyId, out var company) && company is not null
            ? company.Name
            : companyId;

    private string GenerateReadSasUrl(BlobClient blobClient)
    {
        if (!blobClient.CanGenerateSasUri)
        {
            _logger.LogWarning("BlobClient cannot generate SAS — falling back to raw URI (will require auth)");
            return blobClient.Uri.ToString();
        }

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = blobClient.BlobContainerName,
            BlobName = blobClient.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(30),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return blobClient.GenerateSasUri(sasBuilder).ToString();
    }

    private static DateTimeOffset ParseRunTimestamp(string runId)
    {
        // Run IDs are like "2026-04-14-153704"
        if (DateTimeOffset.TryParseExact(
                runId,
                "yyyy-MM-dd-HHmmss",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal,
                out var parsed))
        {
            return parsed;
        }
        return DateTimeOffset.MinValue;
    }
}
