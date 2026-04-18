using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs.Discord;
using UptimeDaddy.API.DTOs.DiscordEvents;
using UptimeDaddy.API.Models;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DiscordController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly INotificationEventPublisher _notificationEventPublisher;

        public DiscordController(AppDbContext db, INotificationEventPublisher notificationEventPublisher)
        {
            _db = db;
            _notificationEventPublisher = notificationEventPublisher;
        }

        private bool TryGetUserId(out long userId)
        {
            userId = 0;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return !string.IsNullOrWhiteSpace(claim) && long.TryParse(claim, out userId);
        }

        [HttpGet("integration")]
        public async Task<IActionResult> GetIntegration()
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            var row = await _db.DiscordIntegrations.AsNoTracking()
                .FirstOrDefaultAsync(i => i.UserId == userId);

            if (row == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                row.Id,
                row.UserId,
                row.GuildId,
                row.DefaultChannelId,
                row.Enabled,
                row.CreatedAt,
                row.UpdatedAt
            });
        }

        [HttpPut("integration")]
        public async Task<IActionResult> UpsertIntegration([FromBody] UpsertDiscordIntegrationDto dto)
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            var exists = await _db.Users.AnyAsync(u => u.Id == userId);
            if (!exists)
            {
                return BadRequest("Account findes ikke.");
            }

            var entity = await _db.DiscordIntegrations.FirstOrDefaultAsync(i => i.UserId == userId);
            var now = DateTime.UtcNow;

            if (entity == null)
            {
                entity = new DiscordIntegration
                {
                    UserId = userId,
                    GuildId = dto.GuildId.Trim(),
                    DefaultChannelId = dto.DefaultChannelId.Trim(),
                    Enabled = dto.Enabled,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _db.DiscordIntegrations.Add(entity);
            }
            else
            {
                entity.GuildId = dto.GuildId.Trim();
                entity.DefaultChannelId = dto.DefaultChannelId.Trim();
                entity.Enabled = dto.Enabled;
                entity.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                entity.Id,
                entity.UserId,
                entity.GuildId,
                entity.DefaultChannelId,
                entity.Enabled,
                entity.CreatedAt,
                entity.UpdatedAt
            });
        }

        [HttpPut("websites/{websiteId:long}/notifications")]
        public async Task<IActionResult> UpsertWebsiteNotifications(
            long websiteId,
            [FromBody] UpsertDiscordMonitorSubscriptionDto dto)
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            var website = await _db.Websites.FirstOrDefaultAsync(w => w.Id == websiteId && w.UserId == userId);
            if (website == null)
            {
                return NotFound("Website blev ikke fundet.");
            }

            var sub = await _db.DiscordMonitorSubscriptions.FirstOrDefaultAsync(s => s.WebsiteId == websiteId);
            if (sub == null)
            {
                sub = new DiscordMonitorSubscription
                {
                    WebsiteId = websiteId,
                    NotificationEnabled = dto.NotificationEnabled,
                    ChannelIdOverride = string.IsNullOrWhiteSpace(dto.ChannelIdOverride)
                        ? null
                        : dto.ChannelIdOverride.Trim()
                };
                _db.DiscordMonitorSubscriptions.Add(sub);
            }
            else
            {
                sub.NotificationEnabled = dto.NotificationEnabled;
                sub.ChannelIdOverride = string.IsNullOrWhiteSpace(dto.ChannelIdOverride)
                    ? null
                    : dto.ChannelIdOverride.Trim();
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                sub.Id,
                sub.WebsiteId,
                sub.NotificationEnabled,
                sub.ChannelIdOverride
            });
        }

        [HttpGet("report-schedules")]
        public async Task<IActionResult> ListReportSchedules()
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            var rows = await _db.DiscordReportSchedules.AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderBy(s => s.Id)
                .Select(s => new
                {
                    s.Id,
                    s.UserId,
                    s.ChannelId,
                    s.CronExpression,
                    s.ReportType,
                    s.Enabled,
                    s.LastRunAt,
                    s.CreatedAt
                })
                .ToListAsync();

            return Ok(rows);
        }

        [HttpPost("report-schedules")]
        public async Task<IActionResult> CreateReportSchedule([FromBody] CreateDiscordReportScheduleDto dto)
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            var exists = await _db.Users.AnyAsync(u => u.Id == userId);
            if (!exists)
            {
                return BadRequest("Account findes ikke.");
            }

            var entity = new DiscordReportSchedule
            {
                UserId = userId,
                ChannelId = string.IsNullOrWhiteSpace(dto.ChannelId) ? null : dto.ChannelId.Trim(),
                CronExpression = dto.CronExpression.Trim(),
                ReportType = dto.ReportType.Trim(),
                Enabled = dto.Enabled,
                CreatedAt = DateTime.UtcNow
            };

            _db.DiscordReportSchedules.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                entity.Id,
                entity.UserId,
                entity.ChannelId,
                entity.CronExpression,
                entity.ReportType,
                entity.Enabled,
                entity.LastRunAt,
                entity.CreatedAt
            });
        }

        [HttpPut("report-schedules/{id:long}")]
        public async Task<IActionResult> UpdateReportSchedule(long id, [FromBody] UpdateDiscordReportScheduleDto dto)
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            var entity = await _db.DiscordReportSchedules.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (entity == null)
            {
                return NotFound();
            }

            entity.ChannelId = string.IsNullOrWhiteSpace(dto.ChannelId) ? null : dto.ChannelId.Trim();
            entity.CronExpression = dto.CronExpression.Trim();
            entity.ReportType = dto.ReportType.Trim();
            entity.Enabled = dto.Enabled;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                entity.Id,
                entity.UserId,
                entity.ChannelId,
                entity.CronExpression,
                entity.ReportType,
                entity.Enabled,
                entity.LastRunAt,
                entity.CreatedAt
            });
        }

        [HttpDelete("report-schedules/{id:long}")]
        public async Task<IActionResult> DeleteReportSchedule(long id)
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            var entity = await _db.DiscordReportSchedules.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (entity == null)
            {
                return NotFound();
            }

            _db.DiscordReportSchedules.Remove(entity);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("reports/trigger")]
        public async Task<IActionResult> TriggerReport([FromBody] TriggerDiscordReportDto dto)
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized("Kunne ikke finde bruger-id i token.");
            }

            if (dto.WebsiteIds is { Count: > 0 })
            {
                var allowed = await _db.Websites
                    .Where(w => w.UserId == userId && dto.WebsiteIds.Contains(w.Id))
                    .Select(w => w.Id)
                    .ToListAsync();

                if (allowed.Count != dto.WebsiteIds.Count)
                {
                    return BadRequest("Et eller flere websiteIds tilhører ikke dig.");
                }
            }

            var evt = new DiscordReportRequestEventDto
            {
                IdempotencyKey = Guid.NewGuid().ToString("N"),
                WorkspaceId = userId,
                ReportType = string.IsNullOrWhiteSpace(dto.ReportType) ? "summary" : dto.ReportType.Trim(),
                WebsiteIds = dto.WebsiteIds,
                RequestedAt = DateTime.UtcNow
            };

            await _notificationEventPublisher.PublishReportRequestAsync(evt, HttpContext.RequestAborted);

            return Accepted(new { message = "Rapport-anmodning sendt til Discord worker.", evt.IdempotencyKey });
        }
    }
}
