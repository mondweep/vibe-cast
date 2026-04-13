namespace FinabeoMarketingAgent.Functions.Services;

/// <summary>
/// Abstraction for uploading workflow outputs to blob storage.
/// Supports both text (JSON) and binary (DOCX, PPTX, images) content.
/// </summary>
public interface IOutputUploader
{
    /// <summary>Upload text content (e.g. JSON results)</summary>
    Task UploadTextAsync(string blobName, string content, string contentType);

    /// <summary>Upload binary content (e.g. DOCX, PPTX, images)</summary>
    Task UploadBytesAsync(string blobName, byte[] content, string contentType);

    /// <summary>List all output runs (date-prefixed folders)</summary>
    Task<IReadOnlyList<string>> ListRunsAsync();
}
