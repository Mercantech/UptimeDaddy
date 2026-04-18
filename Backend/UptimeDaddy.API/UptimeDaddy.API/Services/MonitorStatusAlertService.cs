using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs.DiscordEvents;
using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services
{
    public class MonitorStatusAlertService
    {
        private readonly INotificationEventPublisher _publisher;
        private readonly IConfiguration _configuration;

        public MonitorStatusAlertService(INotificationEventPublisher publisher, IConfiguration configuration)
        {
            _publisher = publisher;
            _configuration = configuration;
        }

        public async Task ProcessNewMeasurementsAsync(
            AppDbContext db,
            IReadOnlyList<Measurement> measurements,
            CancellationToken cancellationToken = default)
        {
            foreach (var m in measurements)
            {
                await ProcessOneAsync(db, m, cancellationToken);
            }
        }

        private async Task ProcessOneAsync(AppDbContext db, Measurement m, CancellationToken cancellationToken)
        {
            var website = await db.Websites
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == m.WebsiteId, cancellationToken);

            if (website == null)
            {
                return;
            }

            var integration = await db.DiscordIntegrations
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.UserId == website.UserId, cancellationToken);

            if (integration == null || !integration.Enabled)
            {
                return;
            }

            var sub = await db.DiscordMonitorSubscriptions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.WebsiteId == website.Id, cancellationToken);

            if (sub == null || !sub.NotificationEnabled)
            {
                return;
            }

            var isUp = MonitorStatusEvaluator.IsUp(m.StatusCode);
            var state = await db.MonitorIncidentStates
                .FirstOrDefaultAsync(s => s.WebsiteId == website.Id, cancellationToken);

            if (state == null)
            {
                db.MonitorIncidentStates.Add(new MonitorIncidentState
                {
                    WebsiteId = website.Id,
                    LastIsUp = isUp,
                    LastStatusCode = m.StatusCode,
                    LastTransitionAt = DateTime.UtcNow,
                    Initialized = true
                });
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            if (state.LastIsUp == isUp)
            {
                state.LastStatusCode = m.StatusCode;
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            var cooldownSeconds = int.TryParse(_configuration["Discord:NotificationCooldownSeconds"], out var c)
                ? c
                : 60;

            if (state.LastNotificationSentAt.HasValue &&
                (DateTime.UtcNow - state.LastNotificationSentAt.Value).TotalSeconds < cooldownSeconds)
            {
                state.LastIsUp = isUp;
                state.LastStatusCode = m.StatusCode;
                state.LastTransitionAt = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            var prevUp = state.LastIsUp;
            state.LastIsUp = isUp;
            state.LastStatusCode = m.StatusCode;
            state.LastTransitionAt = DateTime.UtcNow;
            state.LastNotificationSentAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            var dto = new MonitorStatusNotificationEventDto
            {
                IdempotencyKey = Guid.NewGuid().ToString("N"),
                WorkspaceId = website.UserId,
                WebsiteId = website.Id,
                WebsiteUrl = website.Url,
                PrevStatus = prevUp ? "up" : "down",
                Status = isUp ? "up" : "down",
                StatusCode = m.StatusCode,
                OccurredAt = DateTime.UtcNow,
                TotalTimeMs = m.TotalTimeMs
            };

            await _publisher.PublishMonitorStatusAsync(dto, cancellationToken);
        }
    }
}
