using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs;
using UptimeDaddy.API.Models;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MonitorsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMqttPublishService _mqttPublishService;

        public MonitorsController(AppDbContext context, IMqttPublishService mqttPublishService)
        {
            _context = context;
            _mqttPublishService = mqttPublishService;
        }

        private bool TryGetUserId(out long userId)
        {
            userId = 0;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return !string.IsNullOrWhiteSpace(claim) && long.TryParse(claim, out userId);
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

        private static object MapPath(MonitorPath p, bool includeMeasurements)
        {
            var measurements = includeMeasurements
                ? (p.Measurements ?? new List<Measurement>())
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(MapMeasurement)
                    .ToList()
                : null;

            var latest = includeMeasurements
                ? (p.Measurements ?? new List<Measurement>()).OrderByDescending(m => m.CreatedAt).FirstOrDefault()
                : null;

            return new
            {
                id = p.Id,
                monitorId = p.MonitorId,
                path = p.Path,
                displayLabel = p.DisplayLabel,
                keyword = p.Keyword,
                keywordMustContain = p.KeywordMustContain,
                displayUrl = p.Monitor != null
                    ? MonitorUrlParser.DisplayUrl(p.Monitor.BaseUrl, p.Path)
                    : p.Path,
                latestStatusCode = latest?.StatusCode,
                latestTotalTimeMs = latest?.TotalTimeMs,
                isUp = latest != null && MonitorStatusEvaluator.IsMeasurementUp(latest),
                measurements
            };
        }

        private object MapMonitor(SiteMonitor m, bool includeMeasurements)
        {
            var paths = m.Paths.OrderBy(p => p.Path).ToList();
            var rollup = MonitorRollupService.Compute(paths);
            var rollupSegments = includeMeasurements
                ? MonitorRollupService.ComputeRollupSegments(paths)
                : null;

            return new
            {
                id = m.Id,
                baseUrl = m.BaseUrl,
                intervalTime = m.IntervalTime,
                userId = m.UserId,
                faviconBase64 = m.FaviconBase64,
                sslExpiresAt = m.SslExpiresAt,
                paths = paths.Select(p =>
                {
                    if (p.Monitor == null) p.Monitor = m;
                    return MapPath(p, includeMeasurements);
                }),
                rollup = new
                {
                    isUp = rollup.IsUp,
                    latestStatusCode = rollup.LatestStatusCode,
                    latestTotalTimeMs = rollup.LatestTotalTimeMs,
                    uptimePercent = rollup.UptimePercent,
                    totalChecks = rollup.TotalChecks,
                    segments = rollupSegments
                }
            };
        }

        /// <summary>Worker-endpoint: alle paths fladet ud til ping.</summary>
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var rows = await _context.MonitorPaths
                .AsNoTracking()
                .Include(p => p.Monitor)
                .Select(p => new
                {
                    id = p.Id,
                    monitorId = p.MonitorId,
                    baseUrl = p.Monitor.BaseUrl,
                    path = p.Path,
                    fullUrl = MonitorUrlParser.BuildFullUrl(p.Monitor.BaseUrl, p.Path),
                    intervalTime = p.Monitor.IntervalTime,
                    userId = p.Monitor.UserId,
                    faviconBase64 = p.Monitor.FaviconBase64,
                    keyword = p.Keyword,
                    keywordMustContain = p.KeywordMustContain
                })
                .ToListAsync();

            return Ok(rows);
        }

        [HttpGet("user/{userId:long}")]
        public async Task<IActionResult> GetByUser(long userId)
        {
            var monitors = await _context.Monitors
                .AsNoTracking()
                .Where(m => m.UserId == userId)
                .Include(m => m.Paths)
                .OrderBy(m => m.BaseUrl)
                .ToListAsync();

            return Ok(monitors.Select(m => MapMonitor(m, false)));
        }

        [HttpGet("user/{userId:long}/with-measurements")]
        public async Task<IActionResult> GetByUserWithMeasurements(long userId)
        {
            var monitors = await _context.Monitors
                .AsNoTracking()
                .Where(m => m.UserId == userId)
                .Include(m => m.Paths)
                .ThenInclude(p => p.Measurements)
                .OrderBy(m => m.BaseUrl)
                .ToListAsync();

            return Ok(monitors.Select(m => MapMonitor(m, true)));
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var monitor = await _context.Monitors
                .AsNoTracking()
                .Include(m => m.Paths)
                .ThenInclude(p => p.Measurements)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (monitor == null)
                return NotFound("Monitor blev ikke fundet.");

            return Ok(MapMonitor(monitor, true));
        }

        [HttpPost("ping")]
        public async Task<IActionResult> PreviewPing(
            [FromBody] PingPreviewRequestDto request,
            [FromServices] PingPreviewService pingPreviewService,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Url))
                return BadRequest("URL er påkrævet.");

            var url = request.Url.Trim();
            if (!url.StartsWith("http://") && !url.StartsWith("https://"))
                url = "https://" + url;

            if (!Uri.TryCreate(url, UriKind.Absolute, out _))
                return BadRequest("Ugyldig URL.");

            try
            {
                var result = await pingPreviewService.SendPreviewPingAsync(url, cancellationToken);
                if (result == null)
                    return StatusCode(500, "Ingen respons modtaget.");

                return Ok(new
                {
                    type = result.Type,
                    requestId = result.RequestId,
                    path = result.Path,
                    statusCode = int.TryParse(result.Status, out var statusCode) ? statusCode : 0,
                    dnsLookupMs = result.DnsLookup,
                    connectMs = result.ConnectToPage,
                    tlsHandshakeMs = result.TlsHandShake,
                    timeToFirstByteMs = result.TimeToFirstByte,
                    totalTimeMs = result.TotalTime,
                    keywordMatched = result.KeywordMatched
                });
            }
            catch (TaskCanceledException)
            {
                return StatusCode(408, "Ping preview timeout.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Fejl under preview ping: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMonitorDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            if (dto == null || string.IsNullOrWhiteSpace(dto.BaseUrl))
                return BadRequest("BaseUrl er påkrævet.");

            var (baseUrl, defaultPath) = MonitorUrlParser.Parse(dto.BaseUrl);
            if (string.IsNullOrWhiteSpace(baseUrl) || !baseUrl.Contains('.'))
                return BadRequest("Ugyldigt domæne.");

            var paths = dto.Paths?.Count > 0
                ? dto.Paths
                : new List<CreateMonitorPathDto> { new() { Path = defaultPath } };

            var normalizedPaths = paths
                .Select(p =>
                {
                    var path = string.IsNullOrWhiteSpace(p.Path) ? "/" : p.Path.Trim();
                    if (!path.StartsWith('/'))
                        path = "/" + path;
                    return new { path, p.DisplayLabel, p.Keyword, p.KeywordMustContain };
                })
                .GroupBy(p => p.path.ToLowerInvariant())
                .Select(g => g.First())
                .ToList();

            var exists = await _context.Monitors
                .AnyAsync(m => m.UserId == userId && m.BaseUrl.ToLower() == baseUrl.ToLower());
            if (exists)
                return BadRequest("Du har allerede en monitor for dette domæne.");

            var intervalTime = dto.IntervalTime > 0 ? dto.IntervalTime : 60;

            var monitor = new SiteMonitor
            {
                BaseUrl = baseUrl,
                IntervalTime = intervalTime,
                UserId = userId
            };

            foreach (var p in normalizedPaths)
            {
                monitor.Paths.Add(new MonitorPath
                {
                    Path = p.path,
                    DisplayLabel = p.DisplayLabel,
                    Keyword = string.IsNullOrWhiteSpace(p.Keyword) ? null : p.Keyword.Trim(),
                    KeywordMustContain = p.KeywordMustContain
                });
            }

            _context.Monitors.Add(monitor);
            await _context.SaveChangesAsync();

            foreach (var path in monitor.Paths)
            {
                await _mqttPublishService.PublishMonitorPathCreatedAsync(
                    userId,
                    path.Id,
                    monitor.BaseUrl,
                    path.Path,
                    monitor.IntervalTime,
                    path.Keyword,
                    path.KeywordMustContain);
            }

            monitor = await _context.Monitors
                .AsNoTracking()
                .Include(m => m.Paths)
                .FirstAsync(m => m.Id == monitor.Id);

            return Ok(MapMonitor(monitor, false));
        }

        [HttpPost("{monitorId:long}/paths")]
        public async Task<IActionResult> AddPath(long monitorId, [FromBody] AddMonitorPathDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized();

            var monitor = await _context.Monitors
                .Include(m => m.Paths)
                .FirstOrDefaultAsync(m => m.Id == monitorId && m.UserId == userId);

            if (monitor == null)
                return NotFound();

            var path = string.IsNullOrWhiteSpace(dto.Path) ? "/" : dto.Path.Trim();
            if (!path.StartsWith('/'))
                path = "/" + path;

            if (monitor.Paths.Any(p => p.Path.Equals(path, StringComparison.OrdinalIgnoreCase)))
                return BadRequest("Stien findes allerede på denne monitor.");

            var monitorPath = new MonitorPath
            {
                MonitorId = monitorId,
                Path = path,
                DisplayLabel = dto.DisplayLabel,
                Keyword = string.IsNullOrWhiteSpace(dto.Keyword) ? null : dto.Keyword.Trim(),
                KeywordMustContain = dto.KeywordMustContain
            };

            _context.MonitorPaths.Add(monitorPath);
            await _context.SaveChangesAsync();

            await _mqttPublishService.PublishMonitorPathCreatedAsync(
                userId,
                monitorPath.Id,
                monitor.BaseUrl,
                monitorPath.Path,
                monitor.IntervalTime,
                monitorPath.Keyword,
                monitorPath.KeywordMustContain);

            return Ok(MapPath(monitorPath, false));
        }

        [HttpPut("{id:long}/interval")]
        public async Task<IActionResult> UpdateInterval(long id, [FromBody] UpdateMonitorIntervalDto dto)
        {
            if (dto.IntervalTime <= 0)
                return BadRequest("IntervalTime skal være større end 0.");

            var monitor = await _context.Monitors
                .Include(m => m.Paths)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (monitor == null)
                return NotFound();

            monitor.IntervalTime = dto.IntervalTime;
            await _context.SaveChangesAsync();

            foreach (var path in monitor.Paths)
            {
                await _mqttPublishService.PublishMonitorPathUpdatedAsync(
                    monitor.UserId,
                    path.Id,
                    monitor.BaseUrl,
                    path.Path,
                    monitor.IntervalTime,
                    path.Keyword,
                    path.KeywordMustContain);
            }

            return Ok(MapMonitor(monitor, false));
        }

        [HttpPut("paths/{pathId:long}")]
        public async Task<IActionResult> UpdatePath(long pathId, [FromBody] UpdateMonitorPathDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized();

            var path = await _context.MonitorPaths
                .Include(p => p.Monitor)
                .FirstOrDefaultAsync(p => p.Id == pathId && p.Monitor.UserId == userId);

            if (path == null)
                return NotFound();

            if (dto.DisplayLabel != null)
                path.DisplayLabel = dto.DisplayLabel;
            if (dto.Keyword != null)
                path.Keyword = string.IsNullOrWhiteSpace(dto.Keyword) ? null : dto.Keyword.Trim();
            if (dto.KeywordMustContain.HasValue)
                path.KeywordMustContain = dto.KeywordMustContain.Value;

            await _context.SaveChangesAsync();

            await _mqttPublishService.PublishMonitorPathUpdatedAsync(
                path.Monitor.UserId,
                path.Id,
                path.Monitor.BaseUrl,
                path.Path,
                path.Monitor.IntervalTime,
                path.Keyword,
                path.KeywordMustContain);

            return Ok(MapPath(path, false));
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            var monitor = await _context.Monitors
                .Include(m => m.Paths)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (monitor == null)
                return NotFound();

            var userId = monitor.UserId;
            var pathIds = monitor.Paths.Select(p => p.Id).ToList();

            _context.Monitors.Remove(monitor);
            await _context.SaveChangesAsync();

            foreach (var pathId in pathIds)
            {
                await _mqttPublishService.PublishMonitorPathDeletedAsync(userId, pathId);
            }

            return NoContent();
        }

        [HttpDelete("paths/{pathId:long}")]
        public async Task<IActionResult> DeletePath(long pathId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized();

            var path = await _context.MonitorPaths
                .Include(p => p.Monitor)
                .FirstOrDefaultAsync(p => p.Id == pathId && p.Monitor.UserId == userId);

            if (path == null)
                return NotFound();

            if (path.Monitor.Paths.Count <= 1)
                return BadRequest("En monitor skal have mindst én sti. Slet hele monitoren i stedet.");

            _context.MonitorPaths.Remove(path);
            await _context.SaveChangesAsync();

            await _mqttPublishService.PublishMonitorPathDeletedAsync(userId, pathId);

            return NoContent();
        }
    }
}
