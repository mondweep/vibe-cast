using Azure.Storage.Blobs;
using Azure.Storage.Sas;

namespace FinabeoMarketingAgent.Api.Services;

public record RunFile(string Name, long SizeBytes, string ContentType, string SasUrl, DateTimeOffset LastModified);
public record Run(string RunId, DateTimeOffset Timestamp, IReadOnlyList<RunFile> Files);

public class RunListingService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly string _containerName;
    private readonly ILogger<RunListingService> _logger;

    public RunListingService(BlobServiceClient blobServiceClient, IConfiguration config, ILogger<RunListingService> logger)
    {
        _blobServiceClient = blobServiceClient;
        _containerName = config["OutputContainer"] ?? "marketing-outputs";
        _logger = logger;
    }

    public async Task<IReadOnlyList<Run>> ListRunsAsync(CancellationToken ct = default)
    {
        var container = _blobServiceClient.GetBlobContainerClient(_containerName);
        var grouped = new Dictionary<string, List<RunFile>>();

        await foreach (var blob in container.GetBlobsAsync(cancellationToken: ct))
        {
            var slashIdx = blob.Name.IndexOf('/');
            if (slashIdx <= 0) continue;

            var runId = blob.Name[..slashIdx];
            var fileName = blob.Name[(slashIdx + 1)..];

            var blobClient = container.GetBlobClient(blob.Name);
            var sasUrl = GenerateReadSasUrl(blobClient);

            var file = new RunFile(
                Name: fileName,
                SizeBytes: blob.Properties.ContentLength ?? 0,
                ContentType: blob.Properties.ContentType ?? "application/octet-stream",
                SasUrl: sasUrl,
                LastModified: blob.Properties.LastModified ?? DateTimeOffset.MinValue);

            if (!grouped.TryGetValue(runId, out var list))
            {
                list = new List<RunFile>();
                grouped[runId] = list;
            }
            list.Add(file);
        }

        return grouped
            .Select(kvp => new Run(
                RunId: kvp.Key,
                Timestamp: ParseRunTimestamp(kvp.Key),
                Files: kvp.Value.OrderBy(f => f.Name).ToList()))
            .OrderByDescending(r => r.Timestamp)
            .ToList();
    }

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
