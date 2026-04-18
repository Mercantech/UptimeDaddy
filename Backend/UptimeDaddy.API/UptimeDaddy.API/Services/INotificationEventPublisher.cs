using UptimeDaddy.API.DTOs.DiscordEvents;

namespace UptimeDaddy.API.Services
{
    public interface INotificationEventPublisher
    {
        Task PublishMonitorStatusAsync(MonitorStatusNotificationEventDto dto, CancellationToken cancellationToken = default);
        Task PublishReportRequestAsync(DiscordReportRequestEventDto dto, CancellationToken cancellationToken = default);
    }
}
