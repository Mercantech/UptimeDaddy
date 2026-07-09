using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Models;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/public/boards")]
    public class PublicDashboardsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MonitorDashboardService _dashboardService;
        private readonly PublicBoardShareService _shareService;
        private readonly IConfiguration _configuration;

        public PublicDashboardsController(
            AppDbContext context,
            MonitorDashboardService dashboardService,
            PublicBoardShareService shareService,
            IConfiguration configuration)
        {
            _context = context;
            _dashboardService = dashboardService;
            _shareService = shareService;
            _configuration = configuration;
        }

        private static string NormalizeBoardName(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return string.Empty;
            return raw.Trim().ToLowerInvariant();
        }

        [HttpGet("{publicId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublishedBoard(string publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId))
                return NotFound();

            var normalized = NormalizeBoardName(publicId);
            DashboardBoard? board = null;

            if (!string.IsNullOrEmpty(normalized))
            {
                board = await _context.DashboardBoards
                    .AsNoTracking()
                    .Include(b => b.Items)
                    .FirstOrDefaultAsync(b => b.Name == normalized && b.IsPublished);
            }

            if (board == null)
            {
                board = await _context.DashboardBoards
                    .AsNoTracking()
                    .Include(b => b.Items)
                    .FirstOrDefaultAsync(b => b.ShareToken == publicId && b.IsPublished);
            }

            if (board == null)
                return NotFound();

            var orderedItems = board.Items.OrderBy(i => i.SortOrder).ToList();
            var monitorIds = orderedItems.Select(i => i.MonitorId).ToList();
            var byId = await _dashboardService.GetDashboardMonitorsByIdsLookupAsync(monitorIds);

            var items = new List<object>();
            foreach (var row in orderedItems)
            {
                if (!byId.TryGetValue(row.MonitorId, out var monitor))
                    continue;

                items.Add(MergeBoardRow(row, monitor));
            }

            var overallUp = items.Count == 0 || byId.Values.All(IsMonitorUp);

            var recentIncidents = await _context.MonitorIncidentEvents
                .AsNoTracking()
                .Join(
                    _context.MonitorPaths.AsNoTracking(),
                    e => e.MonitorPathId,
                    p => p.Id,
                    (e, p) => new { Event = e, Path = p })
                .Join(
                    _context.Monitors.AsNoTracking(),
                    x => x.Path.MonitorId,
                    m => m.Id,
                    (x, m) => new { x.Event, x.Path, Monitor = m })
                .Where(x => monitorIds.Contains(x.Monitor.Id))
                .OrderByDescending(x => x.Event.OccurredAt)
                .Take(20)
                .Select(x => new
                {
                    x.Event.OccurredAt,
                    websiteUrl = x.Monitor.BaseUrl + (x.Path.Path == "/" ? "" : x.Path.Path),
                    x.Event.IsUp,
                    x.Event.StatusCode,
                    x.Event.DowntimeDurationMs
                })
                .ToListAsync();

            return Ok(new
            {
                name = board.Name,
                overallStatus = overallUp ? "operational" : "degraded",
                overallLabel = overallUp ? "Alle systemer operative" : "Delvis nedbrud",
                items,
                incidents = recentIncidents
            });
        }

        [HttpGet("{publicId}/social")]
        [AllowAnonymous]
        [Produces("text/html")]
        public async Task<IActionResult> GetSocialPreview(string publicId)
        {
            var preview = await _shareService.GetSharePreviewAsync(publicId);
            if (preview == null)
                return NotFound();

            var pageUrl = BuildBoardPageUrl(preview.PublicId);
            var imageUrl = BuildOgImageUrl(publicId);
            var html = PublicBoardShareService.BuildSocialHtml(preview, pageUrl, imageUrl);
            return Content(html, "text/html; charset=utf-8");
        }

        [HttpGet("{publicId}/og-image.svg")]
        [AllowAnonymous]
        [Produces("image/svg+xml")]
        [ResponseCache(Duration = 120, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetOgImage(string publicId)
        {
            var preview = await _shareService.GetSharePreviewAsync(publicId);
            if (preview == null)
                return NotFound();

            var svg = PublicBoardShareService.BuildOgImageSvg(preview);
            return Content(svg, "image/svg+xml; charset=utf-8");
        }

        private string BuildBoardPageUrl(string publicId)
        {
            var baseUrl = _configuration["Site:PublicBaseUrl"]?.TrimEnd('/');
            if (string.IsNullOrWhiteSpace(baseUrl))
                baseUrl = $"{Request.Scheme}://{Request.Host}";

            return $"{baseUrl}/b/{Uri.EscapeDataString(publicId)}";
        }

        private string BuildOgImageUrl(string publicId)
        {
            var apiBase = _configuration["Site:ApiPublicBaseUrl"]?.TrimEnd('/');
            if (string.IsNullOrWhiteSpace(apiBase))
            {
                var requestBase = $"{Request.Scheme}://{Request.Host}";
                apiBase = requestBase.EndsWith("/api", StringComparison.OrdinalIgnoreCase)
                    ? requestBase
                    : $"{requestBase}/api";
            }

            return $"{apiBase}/public/boards/{Uri.EscapeDataString(publicId)}/og-image.svg";
        }

        private static object MergeBoardRow(DashboardBoardItem row, object monitor)
        {
            var monitorType = monitor.GetType();
            return new
            {
                row.SortOrder,
                row.DisplayLabel,
                monitorId = monitorType.GetProperty("id")!.GetValue(monitor),
                baseUrl = monitorType.GetProperty("baseUrl")!.GetValue(monitor),
                intervalTime = monitorType.GetProperty("intervalTime")!.GetValue(monitor),
                sslExpiresAt = monitorType.GetProperty("sslExpiresAt")!.GetValue(monitor),
                paths = monitorType.GetProperty("paths")!.GetValue(monitor),
                rollup = monitorType.GetProperty("rollup")!.GetValue(monitor),
            };
        }

        private static bool IsMonitorUp(object monitor)
        {
            var rollup = monitor.GetType().GetProperty("rollup")!.GetValue(monitor);
            if (rollup == null)
                return false;

            var isUp = rollup.GetType().GetProperty("isUp")!.GetValue(rollup);
            return isUp is bool up && up;
        }
    }
}
