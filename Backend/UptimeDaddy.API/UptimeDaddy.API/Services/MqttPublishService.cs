using System.Text;
using System.Text.Json;
using MQTTnet;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Services
{
    public class MqttPublishService : IMqttPublishService
    {
        private readonly IConfiguration _configuration;

        public MqttPublishService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task PublishWebsiteCreatedAsync(long userId, long websiteId, string url, int intervalTime)
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

            var payloadObject = new
            {
                type = "website_created",
                userId = userId,
                websiteId = websiteId,
                path = url,
                interval_time = intervalTime,
                timestamp = DateTime.UtcNow
            };

            var payload = JsonSerializer.Serialize(payloadObject);

            var message = new MqttApplicationMessageBuilder()
                .WithTopic("uptime/websites/created")
                .WithPayload(Encoding.UTF8.GetBytes(payload))
                .Build();

            try
            {
                await client.ConnectAsync(options);
                await client.PublishAsync(message);
                await client.DisconnectAsync();

                Console.WriteLine("MQTT publish: website_created");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MQTT publish failed (website_created): {ex.Message}");
            }
        }

        public async Task PublishWebsiteDeletedAsync(long userId, long websiteId)
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

            var payloadObject = new
            {
                type = "website_deleted",
                userId = userId,
                websiteId = websiteId,
                timestamp = DateTime.UtcNow
            };

            var payload = JsonSerializer.Serialize(payloadObject);

            var message = new MqttApplicationMessageBuilder()
                .WithTopic("uptime/websites/deleted")
                .WithPayload(Encoding.UTF8.GetBytes(payload))
                .Build();

            try
            {
                await client.ConnectAsync(options);
                await client.PublishAsync(message);
                await client.DisconnectAsync();

                Console.WriteLine("MQTT publish: website_deleted");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MQTT publish failed (website_deleted): {ex.Message}");
            }
        }
        public async Task PublishPingPreviewAsync(string requestId, string url)
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

            var payloadObject = new
            {
                type = "ping_preview",
                requestId = requestId,
                path = url,
                timestamp = DateTime.UtcNow
            };

            var payload = JsonSerializer.Serialize(payloadObject);

            var message = new MqttApplicationMessageBuilder()
                .WithTopic("uptime/ping/requests")
                .WithPayload(Encoding.UTF8.GetBytes(payload))
                .Build();

            try
            {
                await client.ConnectAsync(options);
                await client.PublishAsync(message);
                await client.DisconnectAsync();

                Console.WriteLine("MQTT publish: ping_preview");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MQTT publish failed (ping_preview): {ex.Message}");
                throw;
            }
        }

        public async Task PublishWebsiteUpdatedAsync(long userId, long websiteId, string url, int intervalTime)
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

            var payloadObject = new
            {
                type = "website_updated",
                userId = userId,
                websiteId = websiteId,
                path = url,
                interval_time = intervalTime,
                timestamp = DateTime.UtcNow
            };

            var payload = JsonSerializer.Serialize(payloadObject);

            var message = new MqttApplicationMessageBuilder()
                .WithTopic("uptime/websites/updated")
                .WithPayload(Encoding.UTF8.GetBytes(payload))
                .Build();

            try
            {
                await client.ConnectAsync(options);
                await client.PublishAsync(message);
                await client.DisconnectAsync();

                Console.WriteLine("MQTT publish: website_updated");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MQTT publish failed (website_updated): {ex.Message}");
            }
        }
    }
}