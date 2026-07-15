namespace UptimeDaddy.API.Services;

public sealed class EmailTemplateRenderer(IWebHostEnvironment env)
{
    public const string LogoContentId = "uptimedaddy-logo";

    private readonly string _templateDir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "email-templates");
    private readonly string _emailAssetDir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "email");

    public string? LogoFilePath
    {
        get
        {
            var path = Path.Combine(_emailAssetDir, "logo.png");
            return File.Exists(path) ? path : null;
        }
    }

    public IReadOnlyList<EmailInlineImage> LogoInlineImages()
    {
        var logo = LogoFilePath;
        if (logo is null)
            return [];

        return
        [
            new EmailInlineImage
            {
                ContentId = LogoContentId,
                FilePath = logo,
                MediaType = "image/png"
            }
        ];
    }

    public async Task<string> RenderLayoutAsync(
        string contentHtml,
        string preheader,
        string? dashboardUrl = null,
        CancellationToken cancellationToken = default)
    {
        var dashboardFooter = string.IsNullOrWhiteSpace(dashboardUrl)
            ? string.Empty
            : $" <a href=\"{System.Net.WebUtility.HtmlEncode(dashboardUrl)}\" style=\"color:#4ea584;text-decoration:underline;\">Åbn dashboard</a>";

        var values = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["brandTitle"] = "UptimeDaddy",
            ["preheader"] = preheader,
            ["logoSrc"] = $"cid:{LogoContentId}",
            ["content"] = contentHtml,
            ["dashboardFooter"] = dashboardFooter
        };

        return await RenderAsync("layout.html", values, cancellationToken);
    }

    public Task<string> RenderAsync(
        string templateFileName,
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken = default)
    {
        var path = Path.Combine(_templateDir, templateFileName);
        if (!File.Exists(path))
            throw new FileNotFoundException($"E-mail-skabelon mangler: {templateFileName}", path);

        return RenderFileAsync(path, values, cancellationToken);
    }

    private static async Task<string> RenderFileAsync(
        string path,
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        var html = await File.ReadAllTextAsync(path, cancellationToken);
        foreach (var (key, value) in values)
            html = html.Replace("{{" + key + "}}", value ?? string.Empty, StringComparison.Ordinal);
        return html;
    }

    public static string CtaBlock(string? dashboardUrl)
    {
        if (string.IsNullOrWhiteSpace(dashboardUrl))
            return string.Empty;

        var safe = System.Net.WebUtility.HtmlEncode(dashboardUrl);
        return $"""
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0;">
              <tr>
                <td style="border-radius:8px;background:#408a71;border:1px solid #4ea584;">
                  <a href="{safe}" style="display:inline-block;padding:12px 22px;font-family:ui-monospace,Consolas,monospace;font-size:13px;font-weight:700;color:#091413;text-decoration:none;border-radius:8px;">Åbn UptimeDaddy</a>
                </td>
              </tr>
            </table>
            """;
    }
}
