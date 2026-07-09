namespace UptimeDaddy.API.Services
{
    public interface IMqttPublishService
    {
        Task PublishMonitorPathCreatedAsync(
            long userId,
            long monitorPathId,
            string baseUrl,
            string path,
            int intervalTime,
            string? keyword = null,
            bool keywordMustContain = true);

        Task PublishMonitorPathDeletedAsync(long userId, long monitorPathId);

        Task PublishPingPreviewAsync(string requestId, string url, string? keyword = null, bool keywordMustContain = true);

        Task PublishMonitorPathUpdatedAsync(
            long userId,
            long monitorPathId,
            string baseUrl,
            string path,
            int intervalTime,
            string? keyword = null,
            bool keywordMustContain = true);
    }
}
