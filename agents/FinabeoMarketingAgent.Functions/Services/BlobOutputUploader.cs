using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FinabeoMarketingAgent.Functions.Services;

/// <summary>
/// Uploads workflow outputs to Azure Blob Storage.
/// Container is auto-created on first use.
/// Blob paths follow: {container}/{runId}/{filename}
/// </summary>
public class BlobOutputUploader : IOutputUploader
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly string _containerName;
    private readonly ILogger<BlobOutputUploader> _logger;
    private BlobContainerClient? _containerClient;

    public BlobOutputUploader(
        BlobServiceClient blobServiceClient,
        IConfiguration configuration,
        ILogger<BlobOutputUploader> logger)
    {
        _blobServiceClient = blobServiceClient;
        _containerName = configuration["OutputContainer"] ?? "marketing-outputs";
        _logger = logger;
    }

    public async Task UploadTextAsync(string blobName, string content, string contentType)
    {
        var container = await GetContainerAsync();
        var blobClient = container.GetBlobClient(blobName);

        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(content));
        await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType },
            conditions: null);

        _logger.LogInformation("Uploaded text blob: {BlobName}", blobName);
    }

    public async Task UploadBytesAsync(string blobName, byte[] content, string contentType)
    {
        var container = await GetContainerAsync();
        var blobClient = container.GetBlobClient(blobName);

        using var stream = new MemoryStream(content);
        await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType },
            conditions: null);

        _logger.LogInformation("Uploaded binary blob: {BlobName} ({Size} bytes)", blobName, content.Length);
    }

    public async Task<IReadOnlyList<string>> ListRunsAsync()
    {
        var container = await GetContainerAsync();
        var runs = new HashSet<string>();

        await foreach (var blob in container.GetBlobsAsync())
        {
            // Extract run prefix (e.g. "2026-04-13-080000" from "2026-04-13-080000/marketing-content.json")
            var parts = blob.Name.Split('/');
            if (parts.Length > 1)
            {
                runs.Add(parts[0]);
            }
        }

        return runs.OrderByDescending(r => r).ToList();
    }

    private async Task<BlobContainerClient> GetContainerAsync()
    {
        if (_containerClient != null)
            return _containerClient;

        _containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        await _containerClient.CreateIfNotExistsAsync(PublicAccessType.None);

        return _containerClient;
    }
}
