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
    public class WebsitesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMqttPublishService _mqttPublishService;

        public WebsitesController(AppDbContext context, IMqttPublishService mqttPublishService)
        {
            _context = context;
            _mqttPublishService = mqttPublishService;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var websites = await _context.Websites
                .Select(w => new
                {
                    id = w.Id,
                    url = w.Url,
                    intervalTime = w.IntervalTime,
                    userId = w.UserId,
                    faviconBase64 = w.FaviconBase64
                })
                .ToListAsync();

            return Ok(websites);
        }

        [HttpGet("user/{userId:long}")]
        public async Task<IActionResult> GetByUser(long userId)
        {
            var websites = await _context.Websites
                .Where(w => w.UserId == userId)
                .Select(w => new
                {
                    id = w.Id,
                    url = w.Url,
                    intervalTime = w.IntervalTime,
                    userId = w.UserId,
                    faviconBase64 = w.FaviconBase64
                })
                .ToListAsync();

            return Ok(websites);
        }

        [HttpGet("user/{userId:long}/with-measurements")]
        public async Task<IActionResult> GetByUserWithMeasurements(long userId)
        {
            var websites = await _context.Websites
                .Where(w => w.UserId == userId)
                .Select(w => new
                {
                    id = w.Id,
                    url = w.Url,
                    intervalTime = w.IntervalTime,
                    userId = w.UserId,
                    faviconBase64 = w.FaviconBase64,
                    measurements = w.Measurements
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
                        .ToList()
                })
                .ToListAsync();

            return Ok(websites);
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var website = await _context.Websites
                .Select(w => new
                {
                    id = w.Id,
                    url = w.Url,
                    intervalTime = w.IntervalTime,
                    userId = w.UserId,
                    faviconBase64 = w.FaviconBase64
                })
                .FirstOrDefaultAsync(w => w.id == id);

            if (website == null)
            {
                return NotFound("Website blev ikke fundet.");
            }

            return Ok(website);
        }

        [HttpGet("{id:long}/status")]
        public async Task<IActionResult> GetStatus(long id)
        {
            var latestMeasurement = await _context.Measurements
                .Where(m => m.WebsiteId == id)
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

        [HttpPost("ping")]
        public async Task<IActionResult> PreviewPing(
            [FromBody] PingPreviewRequestDto request,
            [FromServices] PingPreviewService pingPreviewService,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Url))
            {
                return BadRequest("URL er påkrævet.");
            }

            var url = request.Url.Trim();

            if (!url.StartsWith("http://") && !url.StartsWith("https://"))
            {
                url = "https://" + url;
            }

            if (!Uri.TryCreate(url, UriKind.Absolute, out _))
            {
                return BadRequest("Ugyldig URL.");
            }

            try
            {
                var result = await pingPreviewService.SendPreviewPingAsync(url, cancellationToken);

                if (result == null)
                {
                    return StatusCode(500, "Ingen respons modtaget.");
                }

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
                    totalTimeMs = result.TotalTime
                });
            }
            catch (TaskCanceledException)
            {
                return StatusCode(408, "Ping preview timeout - Raspberry Pi svarede ikke i tide.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Fejl under preview ping: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateWebsiteDto dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest("Body mangler.");

                if (string.IsNullOrWhiteSpace(dto.Url))
                    return BadRequest("URL er påkrævet.");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrWhiteSpace(userIdClaim))
                    return Unauthorized("Kunne ikke finde bruger-id i token.");

                if (!long.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Ugyldigt bruger-id i token.");

                var accountExists = await _context.Users.AnyAsync(u => u.Id == userId);
                if (!accountExists)
                    return BadRequest("Account findes ikke.");

                var url = dto.Url.Trim();

                if (string.IsNullOrWhiteSpace(url))
                    return BadRequest("URL er påkrævet.");

                if (!url.Contains("."))
                    return BadRequest("Ugyldig URL.");

                var normalizedUrl = url.ToLower();

                var websiteAlreadyExists = await _context.Websites
                    .AnyAsync(w => w.UserId == userId && w.Url.ToLower() == normalizedUrl);

                if (websiteAlreadyExists)
                    return BadRequest("Du har allerede tilføjet dette website.");

                var intervalTime = dto.IntervalTime > 0 ? dto.IntervalTime : 60;

                var website = new Website
                {
                    Url = url,
                    IntervalTime = intervalTime,
                    UserId = userId
                };

                _context.Websites.Add(website);
                await _context.SaveChangesAsync();

                await _mqttPublishService.PublishWebsiteCreatedAsync(
                    website.UserId,
                    website.Id,
                    website.Url,
                    website.IntervalTime
                );

                return Ok(new
                {
                    id = website.Id,
                    url = website.Url,
                    intervalTime = website.IntervalTime,
                    userId = website.UserId,
                    faviconBase64 = website.FaviconBase64
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Der opstod en fejl under oprettelse af website.",
                    error = ex.Message
                });
            }
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            var website = await _context.Websites.FirstOrDefaultAsync(w => w.Id == id);

            if (website == null)
            {
                return NotFound("Website blev ikke fundet.");
            }

            var userId = website.UserId;
            var websiteId = website.Id;

            _context.Websites.Remove(website);
            await _context.SaveChangesAsync();

            await _mqttPublishService.PublishWebsiteDeletedAsync(userId, websiteId);

            return NoContent();
        }

        [HttpPut("{id:long}/interval")]
        public async Task<IActionResult> UpdateInterval(long id, [FromBody] UpdateWebsiteIntervalDto dto)
        {
            if (dto.IntervalTime <= 0)
            {
                return BadRequest("IntervalTime skal være større end 0.");
            }

            var website = await _context.Websites.FirstOrDefaultAsync(w => w.Id == id);

            if (website == null)
            {
                return NotFound("Website blev ikke fundet.");
            }

            website.IntervalTime = dto.IntervalTime;

            await _context.SaveChangesAsync();

            await _mqttPublishService.PublishWebsiteUpdatedAsync(
                website.UserId,
                website.Id,
                website.Url,
                website.IntervalTime
            );

            return Ok(new
            {
                id = website.Id,
                url = website.Url,
                intervalTime = website.IntervalTime,
                userId = website.UserId,
                faviconBase64 = website.FaviconBase64
            });
        }
    }
}