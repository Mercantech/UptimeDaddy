using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services
{
    public sealed record BoardSharePreview(
        string BoardName,
        string DisplayName,
        bool OverallUp,
        string OverallLabel,
        int ComponentCount);

    public sealed class PublicBoardShareService
    {
        private readonly AppDbContext _context;
        private readonly MonitorDashboardService _dashboardService;

        public PublicBoardShareService(AppDbContext context, MonitorDashboardService dashboardService)
        {
            _context = context;
            _dashboardService = dashboardService;
        }

        public async Task<BoardSharePreview?> GetSharePreviewAsync(string publicId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(publicId))
                return null;

            var normalized = publicId.Trim().ToLowerInvariant();
            DashboardBoard? board = null;

            if (!string.IsNullOrEmpty(normalized))
            {
                board = await _context.DashboardBoards
                    .AsNoTracking()
                    .Include(b => b.Items)
                    .FirstOrDefaultAsync(b => b.Name == normalized && b.IsPublished, cancellationToken);
            }

            if (board == null)
            {
                board = await _context.DashboardBoards
                    .AsNoTracking()
                    .Include(b => b.Items)
                    .FirstOrDefaultAsync(b => b.ShareToken == publicId && b.IsPublished, cancellationToken);
            }

            if (board == null)
                return null;

            var monitorIds = board.Items.Select(i => i.MonitorId).ToList();
            var monitors = await _dashboardService.GetDashboardMonitorsByIdsLookupAsync(monitorIds, cancellationToken);

            var overallUp = monitors.Count == 0 || monitors.Values.All(IsMonitorUp);
            var overallLabel = overallUp ? "Alle systemer operative" : "Delvis nedbrud";

            return new BoardSharePreview(
                board.Name,
                board.Name.ToUpperInvariant(),
                overallUp,
                overallLabel,
                monitors.Count);
        }

        private static bool IsMonitorUp(object monitor)
        {
            var rollup = monitor.GetType().GetProperty("rollup")!.GetValue(monitor);
            if (rollup == null)
                return false;

            var isUp = rollup.GetType().GetProperty("isUp")!.GetValue(rollup);
            return isUp is bool up && up;
        }

        public static string BuildSocialHtml(
            BoardSharePreview preview,
            string pageUrl,
            string imageUrl)
        {
            var title = $"{preview.DisplayName} — {preview.OverallLabel}";
            var description =
                $"{preview.ComponentCount} komponent{(preview.ComponentCount == 1 ? "" : "er")} overvåget · Live status via UptimeDaddy";

            var encodedTitle = WebUtility.HtmlEncode(title);
            var encodedDescription = WebUtility.HtmlEncode(description);
            var encodedPageUrl = WebUtility.HtmlEncode(pageUrl);
            var encodedImageUrl = WebUtility.HtmlEncode(imageUrl);
            var encodedBoard = WebUtility.HtmlEncode(preview.DisplayName);

            return $"""
                <!DOCTYPE html>
                <html lang="da">
                <head>
                  <meta charset="utf-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <title>{encodedTitle}</title>
                  <meta name="description" content="{encodedDescription}" />
                  <meta property="og:type" content="website" />
                  <meta property="og:site_name" content="UptimeDaddy" />
                  <meta property="og:title" content="{encodedTitle}" />
                  <meta property="og:description" content="{encodedDescription}" />
                  <meta property="og:url" content="{encodedPageUrl}" />
                  <meta property="og:image" content="{encodedImageUrl}" />
                  <meta property="og:image:type" content="image/svg+xml" />
                  <meta property="og:image:width" content="1200" />
                  <meta property="og:image:height" content="630" />
                  <meta name="twitter:card" content="summary_large_image" />
                  <meta name="twitter:title" content="{encodedTitle}" />
                  <meta name="twitter:description" content="{encodedDescription}" />
                  <meta name="twitter:image" content="{encodedImageUrl}" />
                  <link rel="canonical" href="{encodedPageUrl}" />
                </head>
                <body style="margin:0;background:#091413;color:#b0e4cc;font-family:system-ui,sans-serif;">
                  <p style="padding:2rem;">Status for <strong>{encodedBoard}</strong> — <a href="{encodedPageUrl}" style="color:#4ea584;">Åbn status page</a></p>
                </body>
                </html>
                """;
        }

        public static string BuildOgImageSvg(BoardSharePreview preview)
        {
            var boardName = EscapeSvg(preview.DisplayName);
            var statusLabel = EscapeSvg(preview.OverallLabel);
            var componentLabel = EscapeSvg($"{preview.ComponentCount} komponenter");
            var statusColor = preview.OverallUp ? "#4ea584" : "#d4a054";
            var statusGlow = preview.OverallUp ? "#1f8b68" : "#8a5a2f";
            var segments = BuildSegmentBars(preview.OverallUp);

            return $"""
                <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="UptimeDaddy status for {boardName}">
                  <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#091413"/>
                      <stop offset="55%" stop-color="#0b1d19"/>
                      <stop offset="100%" stop-color="#0f1f1c"/>
                    </linearGradient>
                    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#1f8b68"/>
                      <stop offset="100%" stop-color="#408a71"/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="12" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <rect width="1200" height="630" fill="url(#bg)"/>
                  <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="#2f6d59" stroke-width="2"/>
                  <rect x="56" y="56" width="1088" height="518" rx="22" fill="#0b1d19" stroke="#1e3d34"/>
                  <text x="88" y="118" fill="#6d9084" font-family="Segoe UI, system-ui, sans-serif" font-size="28" font-weight="600" letter-spacing="4">UPTIMEDADDY</text>
                  <text x="88" y="210" fill="#e8fff6" font-family="Segoe UI, system-ui, sans-serif" font-size="84" font-weight="700">{boardName}</text>
                  <text x="88" y="262" fill="#8aa89c" font-family="Segoe UI, system-ui, sans-serif" font-size="30">Live status page</text>
                  <rect x="88" y="300" width="360" height="58" rx="29" fill="{statusGlow}" opacity="0.35"/>
                  <rect x="88" y="300" width="360" height="58" rx="29" fill="none" stroke="{statusColor}" stroke-width="2"/>
                  <circle cx="122" cy="329" r="10" fill="{statusColor}" filter="url(#glow)"/>
                  <text x="148" y="338" fill="{statusColor}" font-family="Segoe UI, system-ui, sans-serif" font-size="28" font-weight="700">{statusLabel}</text>
                  <text x="88" y="410" fill="#9bcbb8" font-family="Segoe UI, system-ui, sans-serif" font-size="26">{componentLabel}</text>
                  {segments}
                  <rect x="88" y="470" width="1024" height="12" rx="6" fill="#132821"/>
                  <text x="88" y="540" fill="#408a71" font-family="Segoe UI, system-ui, sans-serif" font-size="22">uptime monitoring · mercantec</text>
                  <rect x="930" y="88" width="182" height="182" rx="36" fill="url(#accent)" opacity="0.18"/>
                  <path d="M1002 138 L1048 184 L1002 230 L956 184 Z" fill="none" stroke="#4ea584" stroke-width="8" stroke-linejoin="round"/>
                  <circle cx="1002" cy="184" r="22" fill="#4ea584"/>
                </svg>
                """;
        }

        private static string BuildSegmentBars(bool overallUp)
        {
            var sb = new StringBuilder();
            const int count = 24;
            const int startX = 88;
            const int y = 430;
            const int width = 18;
            const int gap = 8;
            var upColor = "#4ea584";
            var downColor = "#8a5a2f";
            var emptyColor = "#1a302b";

            for (var i = 0; i < count; i++)
            {
                var x = startX + i * (width + gap);
                var filled = overallUp ? i < 22 : i < 14;
                var partial = !overallUp && i is >= 14 and < 18;
                var color = filled ? upColor : partial ? downColor : emptyColor;
                var height = filled ? 26 : partial ? 18 : 12;
                var rectY = y + (26 - height);
                sb.Append($"<rect x=\"{x}\" y=\"{rectY}\" width=\"{width}\" height=\"{height}\" rx=\"4\" fill=\"{color}\"/>");
            }

            return sb.ToString();
        }

        private static string EscapeSvg(string value) =>
            WebUtility.HtmlEncode(value)
                .Replace("\"", "&quot;", StringComparison.Ordinal);
    }
}
