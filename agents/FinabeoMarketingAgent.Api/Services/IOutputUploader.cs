namespace FinabeoMarketingAgent.Api.Services;

public interface IOutputUploader
{
    Task UploadTextAsync(string blobName, string content, string contentType);
    Task UploadBytesAsync(string blobName, byte[] content, string contentType);
}
