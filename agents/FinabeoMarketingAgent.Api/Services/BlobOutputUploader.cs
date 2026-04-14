using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace FinabeoMarketingAgent.Api.Services;

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
        await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType });
        _logger.LogInformation("Uploaded text blob: {BlobName}", blobName);
    }

    public async Task UploadBytesAsync(string blobName, byte[] content, string contentType)
    {
        var container = await GetContainerAsync();
        var blobClient = container.GetBlobClient(blobName);
        using var stream = new MemoryStream(content);
        await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType });
        _logger.LogInformation("Uploaded binary blob: {BlobName} ({Size} bytes)", blobName, content.Length);
    }

    private async Task<BlobContainerClient> GetContainerAsync()
    {
        if (_containerClient != null) return _containerClient;
        _containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
        await _containerClient.CreateIfNotExistsAsync(PublicAccessType.None);
        return _containerClient;
    }
}
