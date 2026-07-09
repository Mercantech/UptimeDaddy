using System.Text;
using System.Text.Json;
using MQTTnet;
using Microsoft.Extensions.Configuration;

namespace UptimeDaddy.API.Services
{
    public class MqttPublishService : IMqttPublishService
    {
        private readonly IConfiguration _configuration;

        public MqttPublishService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private async Task PublishAsync(string topic, object payloadObject)
        {
            var host = _configuration["Mqtt:Host"];
            var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

            if (string.IsNullOrWhiteSpace(host))
            {
                Console.WriteLine("MQTT host is not configured.");
                return;
            }

            var factory = new MqttClientFactory();
            var client = factory.CreateMqttClient();

            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(host, port)
                .Build();

            var payload = JsonSerializer.Serialize(payloadObject);

            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(Encoding.UTF8.GetBytes(payload))
                .Build();

            try
            {
                await client.ConnectAsync(options);
                await client.PublishAsync(message);
                await client.DisconnectAsync();
                Console.WriteLine($"MQTT publish: {topic}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MQTT publish failed ({topic}): {ex.Message}");
            }
        }

        public Task PublishMonitorPathCreatedAsync(
            long userId,
            long monitorPathId,
            string baseUrl,
            string path,
            int intervalTime,
            string? keyword = null,
            bool keywordMustContain = true)
        {
            return PublishAsync("uptime/monitors/created", new
            {
                type = "monitor_path_created",
                userId,
                monitorPathId,
                baseUrl,
                path,
                fullUrl = MonitorUrlParser.BuildFullUrl(baseUrl, path),
                interval_time = intervalTime,
                keyword,
                keyword_must_contain = keywordMustContain,
                timestamp = DateTime.UtcNow
            });
        }

        public Task PublishMonitorPathDeletedAsync(long userId, long monitorPathId)
        {
            return PublishAsync("uptime/monitors/deleted", new
            {
                type = "monitor_path_deleted",
                userId,
                monitorPathId,
                timestamp = DateTime.UtcNow
            });
        }

        public Task PublishMonitorPathUpdatedAsync(
            long userId,
            long monitorPathId,
            string baseUrl,
            string path,
            int intervalTime,
            string? keyword = null,
            bool keywordMustContain = true)
        {
            return PublishAsync("uptime/monitors/updated", new
            {
                type = "monitor_path_updated",
                userId,
                monitorPathId,
                baseUrl,
                path,
                fullUrl = MonitorUrlParser.BuildFullUrl(baseUrl, path),
                interval_time = intervalTime,
                keyword,
                keyword_must_contain = keywordMustContain,
                timestamp = DateTime.UtcNow
            });
        }

        public Task PublishPingPreviewAsync(string requestId, string url, string? keyword = null, bool keywordMustContain = true)
        {
            return PublishAsync("uptime/ping/requests", new
            {
                type = "ping_preview",
                requestId,
                path = url,
                keyword,
                keyword_must_contain = keywordMustContain,
                timestamp = DateTime.UtcNow
            });
        }
    }
}
