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
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var row = await _db.DiscordIntegrations.AsNoTracking()
                .FirstOrDefaultAsync(i => i.UserId == userId);

            if (row == null)
                return NotFound();

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
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var exists = await _db.Users.AnyAsync(u => u.Id == userId);
            if (!exists)
                return BadRequest("Account findes ikke.");

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

        [HttpGet("paths/{monitorPathId:long}/notifications")]
        public async Task<IActionResult> GetPathNotifications(long monitorPathId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var pathExists = await _db.MonitorPaths.AsNoTracking()
                .Include(p => p.Monitor)
                .AnyAsync(p => p.Id == monitorPathId && p.Monitor.UserId == userId);
            if (!pathExists)
                return NotFound("Monitor-sti blev ikke fundet.");

            var sub = await _db.DiscordMonitorSubscriptions.AsNoTracking()
                .FirstOrDefaultAsync(s => s.MonitorPathId == monitorPathId);

            if (sub == null)
            {
                return Ok(new
                {
                    monitorPathId,
                    notificationEnabled = false,
                    channelIdOverride = (string?)null
                });
            }

            return Ok(new
            {
                monitorPathId = sub.MonitorPathId,
                notificationEnabled = sub.NotificationEnabled,
                channelIdOverride = sub.ChannelIdOverride
            });
        }

        [HttpPut("paths/{monitorPathId:long}/notifications")]
        public async Task<IActionResult> UpsertPathNotifications(
            long monitorPathId,
            [FromBody] UpsertDiscordMonitorSubscriptionDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var path = await _db.MonitorPaths
                .Include(p => p.Monitor)
                .FirstOrDefaultAsync(p => p.Id == monitorPathId && p.Monitor.UserId == userId);
            if (path == null)
                return NotFound("Monitor-sti blev ikke fundet.");

            var sub = await _db.DiscordMonitorSubscriptions.FirstOrDefaultAsync(s => s.MonitorPathId == monitorPathId);
            if (sub == null)
            {
                sub = new DiscordMonitorSubscription
                {
                    MonitorPathId = monitorPathId,
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
                sub.MonitorPathId,
                sub.NotificationEnabled,
                sub.ChannelIdOverride
            });
        }

        [HttpGet("report-schedules")]
        public async Task<IActionResult> ListReportSchedules()
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

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
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var exists = await _db.Users.AnyAsync(u => u.Id == userId);
            if (!exists)
                return BadRequest("Account findes ikke.");

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
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var entity = await _db.DiscordReportSchedules.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (entity == null)
                return NotFound();

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
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var entity = await _db.DiscordReportSchedules.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (entity == null)
                return NotFound();

            _db.DiscordReportSchedules.Remove(entity);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("reports/trigger")]
        public async Task<IActionResult> TriggerReport([FromBody] TriggerDiscordReportDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            if (dto.MonitorIds is { Count: > 0 })
            {
                var allowed = await _db.Monitors
                    .Where(m => m.UserId == userId && dto.MonitorIds.Contains(m.Id))
                    .Select(m => m.Id)
                    .ToListAsync();

                if (allowed.Count != dto.MonitorIds.Count)
                    return BadRequest("Et eller flere monitorIds tilhører ikke dig.");
            }

            var evt = new DiscordReportRequestEventDto
            {
                IdempotencyKey = Guid.NewGuid().ToString("N"),
                WorkspaceId = userId,
                ReportType = string.IsNullOrWhiteSpace(dto.ReportType) ? "summary" : dto.ReportType.Trim(),
                MonitorIds = dto.MonitorIds,
                RequestedAt = DateTime.UtcNow
            };

            await _notificationEventPublisher.PublishReportRequestAsync(evt, HttpContext.RequestAborted);

            return Accepted(new { message = "Rapport-anmodning sendt til Discord worker.", evt.IdempotencyKey });
        }
    }
}
