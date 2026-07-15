using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services;

public class MonitorStatusEmailNotifier
{
    private readonly IEmailService _emailService;
    private readonly EmailTemplateRenderer _templates;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MonitorStatusEmailNotifier> _logger;

    public MonitorStatusEmailNotifier(
        IEmailService emailService,
        EmailTemplateRenderer templates,
        IConfiguration configuration,
        ILogger<MonitorStatusEmailNotifier> logger)
    {
        _emailService = emailService;
        _templates = templates;
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured => _emailService.IsConfigured;

    public async Task<(bool Sent, string? Error)> TrySendTestAsync(
        AppDbContext db,
        long userId,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return (false, "SMTP er ikke konfigureret.");

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null || string.IsNullOrWhiteSpace(user.Email))
            return (false, "Brugeren har ingen e-mail.");

        var displayName = string.IsNullOrWhiteSpace(user.Fullname) ? "der" : user.Fullname.Trim();
        var dashboardUrl = DashboardUrl();

        try
        {
            var content = await _templates.RenderAsync("test.html", new Dictionary<string, string>
            {
                ["displayName"] = WebUtility.HtmlEncode(displayName),
                ["email"] = WebUtility.HtmlEncode(user.Email.Trim()),
                ["sentAt"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC",
                ["ctaBlock"] = EmailTemplateRenderer.CtaBlock(dashboardUrl)
            }, cancellationToken);

            var html = await _templates.RenderLayoutAsync(
                content,
                preheader: "Testmail fra UptimeDaddy — SMTP virker.",
                dashboardUrl,
                cancellationToken);

            await _emailService.SendAsync(new EmailMessage
            {
                ToAddress = user.Email.Trim(),
                ToName = displayName == "der" ? null : displayName,
                Subject = "UptimeDaddy: Test af e-mail-notifikationer",
                HtmlBody = html,
                InlineImages = _templates.LogoInlineImages()
            }, cancellationToken);

            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kunne ikke sende testmail til {Email}", user.Email);
            return (false, "Kunne ikke sende testmail. Tjek SMTP-indstillinger og server-logs.");
        }
    }

    public async Task<bool> TrySendAsync(
        AppDbContext db,
        MonitorPath path,
        Measurement measurement,
        bool prevUp,
        bool isUp,
        double? downtimeDurationMs,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return false;

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == path.Monitor.UserId, cancellationToken);

        if (user == null || string.IsNullOrWhiteSpace(user.Email))
            return false;

        var preference = await db.EmailNotificationPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == user.Id, cancellationToken);

        if (preference != null && !preference.Enabled)
            return false;

        var displayUrl = MonitorUrlParser.DisplayUrl(path.Monitor.BaseUrl, path.Path);
        var subject = isUp
            ? $"UptimeDaddy: {displayUrl} er oppe igen"
            : $"UptimeDaddy: {displayUrl} er nede";

        var statusLine = isUp
            ? "Status skiftede fra <strong style=\"color:#f87171;\">ned</strong> til <strong style=\"color:#6ee7b7;\">oppe</strong>."
            : "Status skiftede fra <strong style=\"color:#6ee7b7;\">oppe</strong> til <strong style=\"color:#f87171;\">ned</strong>.";

        var downtimeBlock = isUp && downtimeDurationMs.HasValue
            ? $"""
              <tr>
                <td style="background:#091413;border:1px solid #1e3d34;border-radius:8px;padding:12px 14px;">
                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6d9084;">Nedetid</p>
                  <p style="margin:0;font-size:18px;font-weight:800;color:#fbbf24;">{WebUtility.HtmlEncode(FormatDuration(downtimeDurationMs.Value))}</p>
                </td>
              </tr>
              """
            : string.Empty;

        var dashboardUrl = DashboardUrl();
        var statusColor = isUp ? "#6ee7b7" : "#f87171";
        var badgeBg = isUp ? "rgba(34,197,94,0.18)" : "rgba(248,113,113,0.18)";
        var badgeBorder = isUp ? "#22c55e" : "#f87171";
        var badgeFg = isUp ? "#6ee7b7" : "#fca5a5";

        try
        {
            var content = await _templates.RenderAsync("monitor-status.html", new Dictionary<string, string>
            {
                ["badgeBg"] = badgeBg,
                ["badgeBorder"] = badgeBorder,
                ["badgeFg"] = badgeFg,
                ["badgeLabel"] = isUp ? "Oppe igen" : "Nede",
                ["headline"] = isUp ? "Genoprettet" : "Nedetid registreret",
                ["statusColor"] = statusColor,
                ["statusLine"] = statusLine,
                ["websiteUrl"] = WebUtility.HtmlEncode(displayUrl),
                ["statusCode"] = measurement.StatusCode.ToString(),
                ["responseTime"] = $"{measurement.TotalTimeMs:F0} ms",
                ["downtimeBlock"] = downtimeBlock,
                ["ctaBlock"] = EmailTemplateRenderer.CtaBlock(dashboardUrl)
            }, cancellationToken);

            var html = await _templates.RenderLayoutAsync(
                content,
                preheader: isUp
                    ? $"{displayUrl} er oppe igen"
                    : $"{displayUrl} er nede",
                dashboardUrl,
                cancellationToken);

            await _emailService.SendAsync(new EmailMessage
            {
                ToAddress = user.Email.Trim(),
                ToName = string.IsNullOrWhiteSpace(user.Fullname) ? null : user.Fullname.Trim(),
                Subject = subject,
                HtmlBody = html,
                InlineImages = _templates.LogoInlineImages()
            }, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kunne ikke sende nedbruds-mail til {Email} for path {PathId}", user.Email, path.Id);
            return false;
        }
    }

    private string? DashboardUrl()
    {
        var site = _configuration["Site:PublicBaseUrl"]?.Trim().TrimEnd('/');
        return string.IsNullOrWhiteSpace(site) ? null : site;
    }

    private static string FormatDuration(double ms)
    {
        if (ms < 60_000)
            return $"{ms / 1000:F0} sek.";

        if (ms < 3_600_000)
            return $"{ms / 60_000:F1} min.";

        return $"{ms / 3_600_000:F1} timer";
    }
}
