using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MeasurementsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MonitorStatusAlertService _monitorStatusAlertService;

        public MeasurementsController(AppDbContext context, MonitorStatusAlertService monitorStatusAlertService)
        {
            _context = context;
            _monitorStatusAlertService = monitorStatusAlertService;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Models.Measurement measurement)
        {
            var exists = await _context.MonitorPaths
                .AnyAsync(p => p.Id == measurement.MonitorPathId);

            if (!exists)
                return BadRequest("Monitor-sti findes ikke (måske slettet)");

            _context.Measurements.Add(measurement);
            await _context.SaveChangesAsync();

            await _monitorStatusAlertService.ProcessNewMeasurementsAsync(
                _context,
                new[] { measurement },
                HttpContext.RequestAborted);

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
                    monitorPathId = m.MonitorPathId,
                    statusCode = m.StatusCode,
                    dnsLookupMs = m.DnsLookupMs,
                    connectMs = m.ConnectMs,
                    tlsHandshakeMs = m.TlsHandshakeMs,
                    timeToFirstByteMs = m.TimeToFirstByteMs,
                    totalTimeMs = m.TotalTimeMs,
                    createdAt = m.CreatedAt,
                    keywordMatched = m.KeywordMatched
                })
                .ToListAsync();

            return Ok(measurements);
        }

        [HttpGet("path/{monitorPathId:long}")]
        public async Task<IActionResult> GetByPath(long monitorPathId, [FromQuery] int? hours)
        {
            var query = _context.Measurements
                .Where(m => m.MonitorPathId == monitorPathId);

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
                    totalTimeMs = m.TotalTimeMs,
                    keywordMatched = m.KeywordMatched
                })
                .ToListAsync();

            return Ok(measurements);
        }

        [HttpGet("path/{monitorPathId:long}/latest")]
        public async Task<IActionResult> GetLatestByPath(long monitorPathId)
        {
            var latestMeasurement = await _context.Measurements
                .Where(m => m.MonitorPathId == monitorPathId)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    monitorPathId = m.MonitorPathId,
                    statusCode = m.StatusCode,
                    totalTimeMs = m.TotalTimeMs,
                    createdAt = m.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (latestMeasurement == null)
                return NotFound("Ingen målinger fundet for denne sti.");

            return Ok(latestMeasurement);
        }
    }
}
