using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class IncidentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public IncidentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] long? monitorPathId,
            [FromQuery] long? monitorId,
            [FromQuery] string? kind = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            if (!long.TryParse(userIdClaim, out var userId))
                return Unauthorized("Ugyldigt bruger-id i token.");

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            if (monitorPathId.HasValue)
            {
                var ownsPath = await _context.MonitorPaths.AsNoTracking()
                    .Include(p => p.Monitor)
                    .AnyAsync(p => p.Id == monitorPathId.Value && p.Monitor.UserId == userId);
                if (!ownsPath)
                    return Forbid();
            }

            if (monitorId.HasValue)
            {
                var ownsMonitor = await _context.Monitors.AsNoTracking()
                    .AnyAsync(m => m.Id == monitorId.Value && m.UserId == userId);
                if (!ownsMonitor)
                    return Forbid();
            }

            var baseQuery = _context.MonitorIncidentEvents.AsNoTracking()
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
                .Where(x => x.Monitor.UserId == userId);

            if (monitorPathId.HasValue)
                baseQuery = baseQuery.Where(x => x.Event.MonitorPathId == monitorPathId.Value);

            if (monitorId.HasValue)
                baseQuery = baseQuery.Where(x => x.Monitor.Id == monitorId.Value);

            var kindNorm = kind?.Trim().ToLowerInvariant();
            if (kindNorm is "down")
                baseQuery = baseQuery.Where(x => !x.Event.IsUp);
            else if (kindNorm is "up")
                baseQuery = baseQuery.Where(x => x.Event.IsUp);

            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .OrderByDescending(x => x.Event.OccurredAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    id = x.Event.Id,
                    monitorPathId = x.Event.MonitorPathId,
                    monitorId = x.Monitor.Id,
                    baseUrl = x.Monitor.BaseUrl,
                    path = x.Path.Path,
                    websiteUrl = x.Monitor.BaseUrl + (x.Path.Path == "/" ? "" : x.Path.Path),
                    occurredAt = x.Event.OccurredAt,
                    isUp = x.Event.IsUp,
                    statusCode = x.Event.StatusCode,
                    totalTimeMs = x.Event.TotalTimeMs,
                    downtimeDurationMs = x.Event.DowntimeDurationMs
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize
            });
        }
    }
}
