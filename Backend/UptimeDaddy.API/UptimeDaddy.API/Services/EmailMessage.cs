namespace UptimeDaddy.API.Services;

public sealed class EmailMessage
{
    public required string ToAddress { get; init; }
    public string? ToName { get; init; }
    public required string Subject { get; init; }
    public required string HtmlBody { get; init; }
    public IReadOnlyList<EmailInlineImage>? InlineImages { get; init; }
}

public sealed class EmailInlineImage
{
    public required string ContentId { get; init; }
    public required string FilePath { get; init; }
    public string MediaType { get; init; } = "image/png";
}
