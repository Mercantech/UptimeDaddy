using Microsoft.Extensions.Configuration;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs.DiscordEvents;
using Microsoft.EntityFrameworkCore;

namespace UptimeDaddy.API.Services
{
    public class SslExpiryAlertService
    {
        private readonly INotificationEventPublisher _publisher;
        private readonly IConfiguration _configuration;

        public SslExpiryAlertService(INotificationEventPublisher publisher, IConfiguration configuration)
        {
            _publisher = publisher;
            _configuration = configuration;
        }

        public async Task CheckAndNotifyAsync(AppDbContext db, long monitorId, CancellationToken cancellationToken = default)
        {
            var monitor = await db.Monitors.AsNoTracking().FirstOrDefaultAsync(m => m.Id == monitorId, cancellationToken);
            if (monitor?.SslExpiresAt == null)
                return;

            var warnDays = int.TryParse(_configuration["Ssl:WarnDaysBeforeExpiry"], out var d) ? d : 14;
            var daysLeft = (monitor.SslExpiresAt.Value - DateTime.UtcNow).TotalDays;

            if (daysLeft > warnDays)
                return;

            var integration = await db.DiscordIntegrations.AsNoTracking()
                .FirstOrDefaultAsync(i => i.UserId == monitor.UserId && i.Enabled, cancellationToken);
            if (integration == null)
                return;

            var dto = new MonitorStatusNotificationEventDto
            {
                IdempotencyKey = $"ssl-{monitor.Id}-{monitor.SslExpiresAt:yyyyMMdd}",
                WorkspaceId = monitor.UserId,
                MonitorId = monitor.Id,
                MonitorPathId = 0,
                WebsiteUrl = monitor.BaseUrl,
                PrevStatus = "up",
                Status = daysLeft < 0 ? "down" : "down",
                StatusCode = daysLeft < 0 ? 0 : 200,
                OccurredAt = DateTime.UtcNow,
                TotalTimeMs = 0
            };

            await _publisher.PublishMonitorStatusAsync(dto, cancellationToken);
        }
    }
}
