using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services
{
    public sealed class MonitorDashboardService
    {
        private readonly AppDbContext _context;

        public MonitorDashboardService(AppDbContext context)
        {
            _context = context;
        }

        private sealed class PathAggregate
        {
            public long PathId { get; init; }
            public int TotalChecks { get; init; }
            public int UpChecks { get; init; }
        }

        public async Task<List<object>> GetDashboardMonitorsAsync(long userId, CancellationToken cancellationToken = default)
        {
            var monitors = await _context.Monitors
                .AsNoTracking()
                .Where(m => m.UserId == userId)
                .Include(m => m.Paths)
                .OrderBy(m => m.BaseUrl)
                .AsSplitQuery()
                .ToListAsync(cancellationToken);

            if (monitors.Count == 0)
                return new List<object>();

            var pathIds = monitors.SelectMany(m => m.Paths).Select(p => p.Id).ToList();
            if (pathIds.Count == 0)
                return monitors.Select(m => MapMonitor(m, new Dictionary<long, Measurement>(), new Dictionary<long, PathAggregate>(), new Dictionary<long, List<Measurement>>())).ToList();

            var aggregates = await _context.Measurements
                .AsNoTracking()
                .Where(m => pathIds.Contains(m.MonitorPathId))
                .GroupBy(m => m.MonitorPathId)
                .Select(g => new PathAggregate
                {
                    PathId = g.Key,
                    TotalChecks = g.Count(),
                    UpChecks = g.Count(m =>
                        m.StatusCode >= 200 && m.StatusCode < 300 &&
                        (m.KeywordMatched == null || m.KeywordMatched == true))
                })
                .ToDictionaryAsync(x => x.PathId, cancellationToken);

            var latestByPath = await _context.Measurements
                .AsNoTracking()
                .Where(m => pathIds.Contains(m.MonitorPathId))
                .GroupBy(m => m.MonitorPathId)
                .Select(g => g.OrderByDescending(m => m.CreatedAt).First())
                .ToDictionaryAsync(m => m.MonitorPathId, cancellationToken);

            var windowStart = DateTime.UtcNow.AddHours(-24);
            var recentMeasurements = await _context.Measurements
                .AsNoTracking()
                .Where(m => pathIds.Contains(m.MonitorPathId) && m.CreatedAt >= windowStart)
                .ToListAsync(cancellationToken);

            var recentByPath = recentMeasurements
                .GroupBy(m => m.MonitorPathId)
                .ToDictionary(g => g.Key, g => g.ToList());

            return monitors
                .Select(m => MapMonitor(m, latestByPath, aggregates, recentByPath))
                .ToList();
        }

        private static object MapMonitor(
            SiteMonitor monitor,
            IReadOnlyDictionary<long, Measurement> latestByPath,
            IReadOnlyDictionary<long, PathAggregate> aggregates,
            IReadOnlyDictionary<long, List<Measurement>> recentByPath)
        {
            var paths = monitor.Paths.OrderBy(p => p.Path).ToList();
            var pathPayloads = paths.Select(p => MapPath(monitor, p, latestByPath, aggregates, recentByPath)).ToList();

            var pathStats = paths.Select(p =>
            {
                latestByPath.TryGetValue(p.Id, out var latest);
                aggregates.TryGetValue(p.Id, out var agg);
                var total = agg?.TotalChecks ?? 0;
                var up = agg?.UpChecks ?? 0;
                var uptime = total > 0 ? Math.Round((double)up / total * 100, 2) : 0;
                var isUp = latest != null && MonitorStatusEvaluator.IsMeasurementUp(latest);
                return new { Latest = latest, IsUp = isUp, Uptime = uptime, Count = total };
            }).ToList();

            var allUp = pathStats.Count > 0 && pathStats.All(s => s.IsUp);
            var maxTotal = pathStats
                .Where(s => s.Latest != null)
                .Select(s => s.Latest!.TotalTimeMs)
                .DefaultIfEmpty(0)
                .Max();
            var worstStatus = pathStats
                .Where(s => s.Latest != null)
                .Select(s => s.Latest!.StatusCode)
                .DefaultIfEmpty(0)
                .Max();
            var combinedUptime = pathStats.Count > 0 ? pathStats.Min(s => s.Uptime) : 0;
            var totalChecks = pathStats.Sum(s => s.Count);

            var pathsForSegments = paths.Select(p =>
            {
                recentByPath.TryGetValue(p.Id, out var recent);
                p.Measurements = recent ?? new List<Measurement>();
                p.Monitor = monitor;
                return p;
            }).ToList();

            var rollupSegments = MonitorRollupService.ComputeRollupSegments(pathsForSegments);

            return new
            {
                id = monitor.Id,
                baseUrl = monitor.BaseUrl,
                intervalTime = monitor.IntervalTime,
                userId = monitor.UserId,
                sslExpiresAt = monitor.SslExpiresAt,
                paths = pathPayloads,
                rollup = new
                {
                    isUp = allUp && pathStats.Any(s => s.Latest != null),
                    latestStatusCode = allUp
                        ? pathStats.FirstOrDefault(s => s.Latest != null)?.Latest?.StatusCode
                        : worstStatus,
                    latestTotalTimeMs = maxTotal,
                    uptimePercent = combinedUptime,
                    totalChecks,
                    segments = rollupSegments
                }
            };
        }

        private static object MapPath(
            SiteMonitor monitor,
            MonitorPath path,
            IReadOnlyDictionary<long, Measurement> latestByPath,
            IReadOnlyDictionary<long, PathAggregate> aggregates,
            IReadOnlyDictionary<long, List<Measurement>> recentByPath)
        {
            latestByPath.TryGetValue(path.Id, out var latest);
            aggregates.TryGetValue(path.Id, out var agg);
            var total = agg?.TotalChecks ?? 0;
            var up = agg?.UpChecks ?? 0;
            var uptimePercent = total > 0 ? Math.Round((double)up / total * 100, 2) : 0;

            recentByPath.TryGetValue(path.Id, out var recent);
            path.Measurements = recent ?? new List<Measurement>();
            path.Monitor = monitor;
            var segments = MonitorRollupService.ComputeRollupSegments(new[] { path });

            return new
            {
                id = path.Id,
                monitorId = path.MonitorId,
                path = path.Path,
                displayLabel = path.DisplayLabel,
                keyword = path.Keyword,
                keywordMustContain = path.KeywordMustContain,
                displayUrl = MonitorUrlParser.DisplayUrl(monitor.BaseUrl, path.Path),
                latestStatusCode = latest?.StatusCode,
                latestTotalTimeMs = latest?.TotalTimeMs,
                isUp = latest != null && MonitorStatusEvaluator.IsMeasurementUp(latest),
                measurementCount = total,
                uptimePercent,
                segments,
                latestMeasurement = latest == null ? null : MapMeasurement(latest)
            };
        }

        private static object MapMeasurement(Measurement m) => new
        {
            id = m.Id,
            monitorPathId = m.MonitorPathId,
            statusCode = m.StatusCode,
            dnsLookupMs = m.DnsLookupMs,
            connectMs = m.ConnectMs,
            tlsHandshakeMs = m.TlsHandshakeMs,
            timeToFirstByteMs = m.TimeToFirstByteMs,
            totalTimeMs = m.TotalTimeMs,
            createdAt = m.CreatedAt,
            keywordMatched = m.KeywordMatched
        };
    }

}
