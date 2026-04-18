using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MeasurementsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MeasurementsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Models.Measurement measurement)
        {
            var exists = await _context.Websites
                .AnyAsync(w => w.Id == measurement.WebsiteId);

            if (!exists)
            {
                return BadRequest("Website findes ikke (måske slettet)");
            }

            _context.Measurements.Add(measurement);
            await _context.SaveChangesAsync();

            return Ok(measurement);
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var measurements = await _context.Measurements
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    id = m.Id,
                    websiteId = m.WebsiteId,
                    statusCode = m.StatusCode,
                    dnsLookupMs = m.DnsLookupMs,
                    connectMs = m.ConnectMs,
                    tlsHandshakeMs = m.TlsHandshakeMs,
                    timeToFirstByteMs = m.TimeToFirstByteMs,
                    totalTimeMs = m.TotalTimeMs,
                    createdAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(measurements);
        }

        [HttpGet("website/{websiteId:long}")]
        public async Task<IActionResult> GetByWebsite(long websiteId, [FromQuery] int? hours)
        {
            var query = _context.Measurements
                .Where(m => m.WebsiteId == websiteId);

            if (hours.HasValue)
            {
                var fromTime = DateTime.UtcNow.AddHours(-hours.Value);
                query = query.Where(m => m.CreatedAt >= fromTime);
            }

            var measurements = await query
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    createdAt = m.CreatedAt,
                    statusCode = m.StatusCode,
                    dnsLookupMs = m.DnsLookupMs,
                    connectMs = m.ConnectMs,
                    tlsHandshakeMs = m.TlsHandshakeMs,
                    timeToFirstByteMs = m.TimeToFirstByteMs,
                    totalTimeMs = m.TotalTimeMs
                })
                .ToListAsync();

            return Ok(measurements);
        }

        [HttpGet("website/{websiteId:long}/latest")]
        public async Task<IActionResult> GetLatestByWebsite(long websiteId)
        {
            var latestMeasurement = await _context.Measurements
                .Where(m => m.WebsiteId == websiteId)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    websiteId = m.WebsiteId,
                    statusCode = m.StatusCode,
                    totalTimeMs = m.TotalTimeMs,
                    createdAt = m.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (latestMeasurement == null)
            {
                return NotFound("Ingen målinger fundet for dette website.");
            }

            return Ok(latestMeasurement);
        }
    }
}