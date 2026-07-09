using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services;

public class MonitorStatusEmailNotifier
{
    private readonly IEmailService _emailService;
    private readonly ILogger<MonitorStatusEmailNotifier> _logger;

    public MonitorStatusEmailNotifier(IEmailService emailService, ILogger<MonitorStatusEmailNotifier> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    public bool IsConfigured => _emailService.IsConfigured;

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
            ? $"Status skiftede fra <strong>ned</strong> til <strong>oppe</strong>."
            : $"Status skiftede fra <strong>oppe</strong> til <strong>ned</strong>.";

        var downtimeLine = isUp && downtimeDurationMs.HasValue
            ? $"<p><strong>Nedetid:</strong> {FormatDuration(downtimeDurationMs.Value)}</p>"
            : string.Empty;

        var html = $"""
            <div style="font-family:Segoe UI,system-ui,sans-serif;line-height:1.5;color:#1a1a1a;">
              <h2 style="margin:0 0 12px;color:{(isUp ? "#15803d" : "#b91c1c")};">
                {(isUp ? "Genoprettet" : "Nedetid registreret")}
              </h2>
              <p><strong>URL:</strong> {System.Net.WebUtility.HtmlEncode(displayUrl)}</p>
              <p>{statusLine}</p>
              <p><strong>HTTP-status:</strong> {measurement.StatusCode}</p>
              <p><strong>Responstid:</strong> {measurement.TotalTimeMs:F0} ms</p>
              {downtimeLine}
              <p style="margin-top:24px;color:#666;font-size:13px;">
                Du modtager denne mail fordi e-mail-notifikationer er aktiveret på din UptimeDaddy-konto.
              </p>
            </div>
            """;

        try
        {
            await _emailService.SendAsync(new EmailMessage
            {
                ToAddress = user.Email.Trim(),
                ToName = string.IsNullOrWhiteSpace(user.Fullname) ? null : user.Fullname.Trim(),
                Subject = subject,
                HtmlBody = html
            }, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kunne ikke sende nedbruds-mail til {Email} for path {PathId}", user.Email, path.Id);
            return false;
        }
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
