using System.Threading.Tasks;

namespace UptimeDaddy.API.Services
{
    public interface IMqttPublishService
    {
        Task PublishWebsiteCreatedAsync(long userId, long websiteId, string url, int intervalTime);
        Task PublishWebsiteDeletedAsync(long userId, long websiteId);
        Task PublishPingPreviewAsync(string requestId, string url);
        Task PublishWebsiteUpdatedAsync(long userId, long websiteId, string url, int intervalTime);
    }
}
