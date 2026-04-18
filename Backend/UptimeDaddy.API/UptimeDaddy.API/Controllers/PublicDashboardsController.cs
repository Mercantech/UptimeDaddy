using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;

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

        /// <summary>Offentligt board via delings-token (kræver IsPublished).</summary>
        [HttpGet("{token}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublishedBoard(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return NotFound();

            var board = await _context.DashboardBoards
                .AsNoTracking()
                .Include(b => b.Items)
                .FirstOrDefaultAsync(b => b.ShareToken == token && b.IsPublished);

            if (board == null)
                return NotFound();

            var orderedItems = board.Items.OrderBy(i => i.SortOrder).ToList();
            var websiteIds = orderedItems.Select(i => i.WebsiteId).ToList();

            var websites = await _context.Websites
                .AsNoTracking()
                .Where(w => websiteIds.Contains(w.Id))
                .Select(w => new
                {
                    w.Id,
                    w.Url,
                    w.IntervalTime,
                    w.FaviconBase64,
                    measurements = w.Measurements
                        .OrderByDescending(m => m.CreatedAt)
                        .Take(200)
                        .Select(m => new
                        {
                            m.Id,
                            m.WebsiteId,
                            m.StatusCode,
                            m.DnsLookupMs,
                            m.ConnectMs,
                            m.TlsHandshakeMs,
                            m.TimeToFirstByteMs,
                            m.TotalTimeMs,
                            m.CreatedAt,
                        })
                        .ToList(),
                })
                .ToListAsync();

            var byId = websites.ToDictionary(w => w.Id);

            var items = new List<object>();
            foreach (var row in orderedItems)
            {
                if (!byId.TryGetValue(row.WebsiteId, out var site))
                    continue;

                items.Add(new
                {
                    row.SortOrder,
                    row.DisplayLabel,
                    url = site.Url,
                    intervalTime = site.IntervalTime,
                    faviconBase64 = site.FaviconBase64,
                    measurements = site.measurements,
                });
            }

            return Ok(new
            {
                name = board.Name,
                items,
            });
        }
    }
}
