using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using MQTTnet;
using UptimeDaddy.API.DTOs.DiscordEvents;

namespace UptimeDaddy.API.Services
{
    public class MqttNotificationEventPublisher : INotificationEventPublisher
    {
        private readonly IConfiguration _configuration;
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        public MqttNotificationEventPublisher(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task PublishMonitorStatusAsync(MonitorStatusNotificationEventDto dto, CancellationToken cancellationToken = default)
        {
            await PublishAsync(DiscordMqttTopics.NotificationEvents, dto, cancellationToken);
        }

        public async Task PublishReportRequestAsync(DiscordReportRequestEventDto dto, CancellationToken cancellationToken = default)
        {
            await PublishAsync(DiscordMqttTopics.ReportRequests, dto, cancellationToken);
        }

        private async Task PublishAsync<T>(string topic, T payload, CancellationToken cancellationToken)
        {
            var host = _configuration["Mqtt:Host"];
            var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

            if (string.IsNullOrWhiteSpace(host))
            {
                Console.WriteLine("MQTT host is not configured; skipping Discord event publish.");
                return;
            }

            var factory = new MqttClientFactory();
            var client = factory.CreateMqttClient();

            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(host, port)
                .Build();

            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(Encoding.UTF8.GetBytes(json))
                .Build();

            try
            {
                await client.ConnectAsync(options, cancellationToken);
                await client.PublishAsync(message, cancellationToken);
                await client.DisconnectAsync(cancellationToken: cancellationToken);
                Console.WriteLine($"MQTT publish Discord event: {topic}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MQTT publish failed ({topic}): {ex.Message}");
            }
        }
    }
}
