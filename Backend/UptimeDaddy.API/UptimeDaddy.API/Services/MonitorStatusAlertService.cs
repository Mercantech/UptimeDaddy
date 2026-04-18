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

                // Første måling «nede»: log som nedbrud — ellers mangler der en fejl-række indtil første genoprettelse.
                if (!isUp)
                {
                    db.MonitorIncidentEvents.Add(new MonitorIncidentEvent
                    {
                        WebsiteId = website.Id,
                        OccurredAt = DateTime.UtcNow,
                        IsUp = false,
                        StatusCode = m.StatusCode,
                        TotalTimeMs = m.TotalTimeMs
                    });
                }

                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            if (state.LastIsUp == isUp)
            {
                state.LastStatusCode = m.StatusCode;
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            var prevUp = state.LastIsUp;

            double? downtimeDurationMs = null;
            if (isUp && !prevUp)
            {
                downtimeDurationMs = Math.Max(
                    0,
                    (DateTime.UtcNow - state.LastTransitionAt).TotalMilliseconds);
            }

            db.MonitorIncidentEvents.Add(new MonitorIncidentEvent
            {
                WebsiteId = website.Id,
                OccurredAt = DateTime.UtcNow,
                IsUp = isUp,
                StatusCode = m.StatusCode,
                TotalTimeMs = m.TotalTimeMs,
                DowntimeDurationMs = downtimeDurationMs
            });

            state.LastIsUp = isUp;
            state.LastStatusCode = m.StatusCode;
            state.LastTransitionAt = DateTime.UtcNow;

            var cooldownSeconds = int.TryParse(_configuration["Discord:NotificationCooldownSeconds"], out var c)
                ? c
                : 60;

            var discordCooldownBlocks =
                state.LastNotificationSentAt.HasValue &&
                (DateTime.UtcNow - state.LastNotificationSentAt.Value).TotalSeconds < cooldownSeconds;

            if (discordCooldownBlocks)
            {
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            var integration = await db.DiscordIntegrations
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.UserId == website.UserId, cancellationToken);

            if (integration == null || !integration.Enabled)
            {
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            var sub = await db.DiscordMonitorSubscriptions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.WebsiteId == website.Id, cancellationToken);

            if (sub == null || !sub.NotificationEnabled)
            {
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

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
                TotalTimeMs = m.TotalTimeMs,
                DowntimeDurationMs = downtimeDurationMs
            };

            await _publisher.PublishMonitorStatusAsync(dto, cancellationToken);
        }
    }
}
