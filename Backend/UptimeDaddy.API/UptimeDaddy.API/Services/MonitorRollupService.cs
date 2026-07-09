using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services
{
    public static class MonitorRollupService
    {
        public record RollupResult(
            bool IsUp,
            int? LatestStatusCode,
            double? LatestTotalTimeMs,
            double UptimePercent,
            int TotalChecks);

        public static RollupResult Compute(IReadOnlyList<MonitorPath> paths)
        {
            if (paths.Count == 0)
                return new RollupResult(false, null, null, 0, 0);

            var pathStats = paths.Select(p =>
            {
                var measurements = p.Measurements ?? new List<Measurement>();
                var latest = measurements.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                var isUp = latest != null && MonitorStatusEvaluator.IsUp(latest.StatusCode) &&
                           (latest.KeywordMatched == null || latest.KeywordMatched == true);
                var uptime = ComputeUptimePercent(measurements);
                return new { Latest = latest, IsUp = isUp, Uptime = uptime, Count = measurements.Count };
            }).ToList();

            var allUp = pathStats.All(s => s.IsUp);
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

            var combinedUptime = pathStats.Count > 0
                ? pathStats.Min(s => s.Uptime)
                : 0;

            var totalChecks = pathStats.Sum(s => s.Count);

            return new RollupResult(
                allUp && pathStats.Any(s => s.Latest != null),
                allUp ? pathStats.FirstOrDefault(s => s.Latest != null)?.Latest?.StatusCode : worstStatus,
                maxTotal,
                combinedUptime,
                totalChecks);
        }

        public static double ComputeUptimePercent(IEnumerable<Measurement> measurements)
        {
            var list = measurements.ToList();
            if (list.Count == 0)
                return 0;

            var upCount = list.Count(m =>
                MonitorStatusEvaluator.IsUp(m.StatusCode) &&
                (m.KeywordMatched == null || m.KeywordMatched == true));

            return Math.Round((double)upCount / list.Count * 100, 2);
        }

        /// <summary>
        /// Rollup uptime-bar segments: green only when all paths were up in the time bucket.
        /// </summary>
        public static List<bool?> ComputeRollupSegments(
            IReadOnlyList<MonitorPath> paths,
            int segmentCount = 24)
        {
            if (paths.Count == 0)
                return Enumerable.Repeat<bool?>(null, segmentCount).ToList();

            var now = DateTime.UtcNow;
            var windowStart = now.AddHours(-24);
            var segmentMs = 24.0 * 60 * 60 * 1000 / segmentCount;

            var segments = new List<bool?>(segmentCount);
            for (var i = 0; i < segmentCount; i++)
            {
                var segStart = windowStart.AddMilliseconds(i * segmentMs);
                var segEnd = segStart.AddMilliseconds(segmentMs);

                var anyData = false;
                var allUp = true;

                foreach (var path in paths)
                {
                    var inSegment = (path.Measurements ?? new List<Measurement>())
                        .Where(m => m.CreatedAt >= segStart && m.CreatedAt < segEnd)
                        .OrderByDescending(m => m.CreatedAt)
                        .FirstOrDefault();

                    if (inSegment == null)
                        continue;

                    anyData = true;
                    var up = MonitorStatusEvaluator.IsUp(inSegment.StatusCode) &&
                             (inSegment.KeywordMatched == null || inSegment.KeywordMatched == true);
                    if (!up)
                        allUp = false;
                }

                segments.Add(anyData ? allUp : null);
            }

            return segments;
        }
    }
}
