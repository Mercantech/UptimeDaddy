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

        public PublicDashboardsController(AppDbContext context)
        {
            _context = context;
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

            var monitors = await _context.Monitors
                .AsNoTracking()
                .Where(m => monitorIds.Contains(m.Id))
                .Include(m => m.Paths)
                .ThenInclude(p => p.Measurements)
                .ToListAsync();

            var byId = monitors.ToDictionary(m => m.Id);

            var items = new List<object>();
            foreach (var row in orderedItems)
            {
                if (!byId.TryGetValue(row.MonitorId, out var monitor))
                    continue;

                var rollup = MonitorRollupService.Compute(monitor.Paths);
                var rollupSegments = MonitorRollupService.ComputeRollupSegments(monitor.Paths);

                items.Add(new
                {
                    row.SortOrder,
                    row.DisplayLabel,
                    monitorId = monitor.Id,
                    baseUrl = monitor.BaseUrl,
                    intervalTime = monitor.IntervalTime,
                    faviconBase64 = monitor.FaviconBase64,
                    sslExpiresAt = monitor.SslExpiresAt,
                    paths = monitor.Paths.OrderBy(p => p.Path).Select(p => new
                    {
                        id = p.Id,
                        path = p.Path,
                        displayUrl = MonitorUrlParser.DisplayUrl(monitor.BaseUrl, p.Path),
                        measurements = p.Measurements
                            .OrderByDescending(m => m.CreatedAt)
                            .Take(200)
                            .Select(m => new
                            {
                                m.Id,
                                monitorPathId = m.MonitorPathId,
                                m.StatusCode,
                                m.DnsLookupMs,
                                m.ConnectMs,
                                m.TlsHandshakeMs,
                                m.TimeToFirstByteMs,
                                m.TotalTimeMs,
                                m.CreatedAt,
                                m.KeywordMatched
                            })
                    }),
                rollup = new
                {
                    isUp = rollup.IsUp,
                    uptimePercent = rollup.UptimePercent,
                    latestTotalTimeMs = rollup.LatestTotalTimeMs,
                    totalChecks = rollup.TotalChecks,
                    segments = rollupSegments
                }
                });
            }

            var overallUp = items.Count == 0 || monitors.All(m =>
            {
                var r = MonitorRollupService.Compute(m.Paths);
                return r.IsUp;
            });

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
    }
}
