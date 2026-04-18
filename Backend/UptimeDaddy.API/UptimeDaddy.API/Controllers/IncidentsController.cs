using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UptimeDaddy.API.Data;

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

        /// <summary>Hændelseslog ved statusskift (op ↔ ned) for brugerens websites.</summary>
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] long? websiteId,
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

            if (websiteId.HasValue)
            {
                var owns = await _context.Websites.AsNoTracking()
                    .AnyAsync(w => w.Id == websiteId.Value && w.UserId == userId);
                if (!owns)
                    return Forbid();
            }

            var baseQuery = _context.MonitorIncidentEvents.AsNoTracking()
                .Join(
                    _context.Websites.AsNoTracking(),
                    e => e.WebsiteId,
                    w => w.Id,
                    (e, w) => new { Event = e, w.UserId, w.Url })
                .Where(x => x.UserId == userId);

            if (websiteId.HasValue)
                baseQuery = baseQuery.Where(x => x.Event.WebsiteId == websiteId.Value);

            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .OrderByDescending(x => x.Event.OccurredAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    id = x.Event.Id,
                    websiteId = x.Event.WebsiteId,
                    websiteUrl = x.Url,
                    occurredAt = x.Event.OccurredAt,
                    isUp = x.Event.IsUp,
                    statusCode = x.Event.StatusCode,
                    totalTimeMs = x.Event.TotalTimeMs
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
