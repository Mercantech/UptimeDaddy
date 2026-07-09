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
        private readonly MonitorStatusEmailNotifier _emailNotifier;
        private readonly IConfiguration _configuration;

        public MonitorStatusAlertService(
            INotificationEventPublisher publisher,
            MonitorStatusEmailNotifier emailNotifier,
            IConfiguration configuration)
        {
            _publisher = publisher;
            _emailNotifier = emailNotifier;
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
            var path = await db.MonitorPaths
                .AsNoTracking()
                .Include(p => p.Monitor)
                .FirstOrDefaultAsync(p => p.Id == m.MonitorPathId, cancellationToken);

            if (path?.Monitor == null)
                return;

            var isUp = MonitorStatusEvaluator.IsMeasurementUp(m);
            var state = await db.MonitorIncidentStates
                .FirstOrDefaultAsync(s => s.MonitorPathId == path.Id, cancellationToken);

            if (state == null)
            {
                db.MonitorIncidentStates.Add(new MonitorIncidentState
                {
                    MonitorPathId = path.Id,
                    LastIsUp = isUp,
                    LastStatusCode = m.StatusCode,
                    LastTransitionAt = DateTime.UtcNow,
                    Initialized = true
                });

                if (!isUp)
                {
                    db.MonitorIncidentEvents.Add(new MonitorIncidentEvent
                    {
                        MonitorPathId = path.Id,
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
                const double maxReasonableMs = 366d * 24 * 60 * 60 * 1000;
                var span = DateTime.UtcNow - state.LastTransitionAt;
                var rawMs = span.TotalMilliseconds;
                if (double.IsFinite(rawMs) && rawMs >= 0 && rawMs <= maxReasonableMs)
                    downtimeDurationMs = rawMs;
                else if (double.IsFinite(rawMs) && rawMs > maxReasonableMs)
                    downtimeDurationMs = maxReasonableMs;
                else
                    downtimeDurationMs = 0;
            }

            db.MonitorIncidentEvents.Add(new MonitorIncidentEvent
            {
                MonitorPathId = path.Id,
                OccurredAt = DateTime.UtcNow,
                IsUp = isUp,
                StatusCode = m.StatusCode,
                TotalTimeMs = m.TotalTimeMs,
                DowntimeDurationMs = downtimeDurationMs
            });

            state.LastIsUp = isUp;
            state.LastStatusCode = m.StatusCode;
            state.LastTransitionAt = DateTime.UtcNow;

            var cooldownSeconds = GetNotificationCooldownSeconds();
            var cooldownBlocks =
                state.LastNotificationSentAt.HasValue &&
                (DateTime.UtcNow - state.LastNotificationSentAt.Value).TotalSeconds < cooldownSeconds;

            var notificationSent = false;

            if (!cooldownBlocks)
            {
                notificationSent |= await TryPublishDiscordAsync(db, path, m, prevUp, isUp, downtimeDurationMs, cancellationToken);
                notificationSent |= await _emailNotifier.TrySendAsync(
                    db, path, m, prevUp, isUp, downtimeDurationMs, cancellationToken);
            }

            if (notificationSent)
                state.LastNotificationSentAt = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
        }

        private int GetNotificationCooldownSeconds()
        {
            if (int.TryParse(_configuration["Email:NotificationCooldownSeconds"], out var emailCooldown))
                return emailCooldown;

            return int.TryParse(_configuration["Discord:NotificationCooldownSeconds"], out var discordCooldown)
                ? discordCooldown
                : 60;
        }

        private async Task<bool> TryPublishDiscordAsync(
            AppDbContext db,
            MonitorPath path,
            Measurement m,
            bool prevUp,
            bool isUp,
            double? downtimeDurationMs,
            CancellationToken cancellationToken)
        {
            var integration = await db.DiscordIntegrations
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.UserId == path.Monitor.UserId, cancellationToken);

            if (integration == null || !integration.Enabled)
                return false;

            var sub = await db.DiscordMonitorSubscriptions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.MonitorPathId == path.Id, cancellationToken);

            if (sub == null || !sub.NotificationEnabled)
                return false;

            var displayUrl = MonitorUrlParser.DisplayUrl(path.Monitor.BaseUrl, path.Path);

            var dto = new MonitorStatusNotificationEventDto
            {
                IdempotencyKey = Guid.NewGuid().ToString("N"),
                WorkspaceId = path.Monitor.UserId,
                MonitorPathId = path.Id,
                MonitorId = path.MonitorId,
                WebsiteUrl = displayUrl,
                PrevStatus = prevUp ? "up" : "down",
                Status = isUp ? "up" : "down",
                StatusCode = m.StatusCode,
                OccurredAt = DateTime.UtcNow,
                TotalTimeMs = m.TotalTimeMs,
                DowntimeDurationMs = downtimeDurationMs
            };

            await _publisher.PublishMonitorStatusAsync(dto, cancellationToken);
            return true;
        }
    }
}
