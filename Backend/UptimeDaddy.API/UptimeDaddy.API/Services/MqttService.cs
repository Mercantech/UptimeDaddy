using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using MQTTnet;
using System.Text;
using System.Text.Json;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs;
using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services
{
    public class MqttService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private IMqttClient? _client;

        public MqttService(IServiceScopeFactory scopeFactory, IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var host = _configuration["Mqtt:Host"];
            var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

            if (string.IsNullOrWhiteSpace(host))
            {
                Console.WriteLine("MQTT host is not configured.");
                return;
            }

            var factory = new MqttClientFactory();
            _client = factory.CreateMqttClient();

            _client.ApplicationMessageReceivedAsync += async e =>
            {
                var topic = e.ApplicationMessage.Topic;
                var payload = e.ApplicationMessage.ConvertPayloadToString();

                Console.WriteLine($"MQTT message received on topic '{topic}': {payload}");

                try
                {
                    if (topic == "uptime/measurements")
                    {
                        var message = JsonSerializer.Deserialize<MqttMeasurementMessageDto>(payload);

                        if (message == null || message.Pages == null || message.Pages.Count == 0)
                        {
                            Console.WriteLine("No pages found in MQTT payload.");
                            return;
                        }

                        using var scope = _scopeFactory.CreateScope();
                        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        var savedBatch = new List<Measurement>();

                        foreach (var page in message.Pages)
                        {
                            var pathExists = await context.MonitorPaths
                                .AnyAsync(p => p.Id == page.Id, stoppingToken);

                            if (!pathExists)
                            {
                                Console.WriteLine($"MonitorPath {page.Id} not found. Skipping measurement.");
                                continue;
                            }

                            var measurement = new Measurement
                            {
                                MonitorPathId = page.Id,
                                StatusCode = int.TryParse(page.Response.Status, out var statusCode) ? statusCode : 0,
                                DnsLookupMs = page.Response.DnsLookup,
                                ConnectMs = page.Response.ConnectToPage,
                                TlsHandshakeMs = page.Response.TlsHandShake,
                                TimeToFirstByteMs = page.Response.TimeToFirstByte,
                                TotalTimeMs = page.Response.TotalTime,
                                KeywordMatched = page.Response.KeywordMatched,
                                CreatedAt = DateTime.UtcNow
                            };

                            context.Measurements.Add(measurement);
                            savedBatch.Add(measurement);
                        }

                        await context.SaveChangesAsync(stoppingToken);
                        Console.WriteLine("Measurements saved to database.");

                        if (savedBatch.Count > 0)
                        {
                            var alertService = scope.ServiceProvider.GetRequiredService<MonitorStatusAlertService>();
                            await alertService.ProcessNewMeasurementsAsync(context, savedBatch, stoppingToken);
                        }

                        if (message.SslExpiresAt.HasValue && message.MonitorId.HasValue)
                        {
                            var monitor = await context.Monitors
                                .FirstOrDefaultAsync(m => m.Id == message.MonitorId.Value, stoppingToken);
                            if (monitor != null)
                            {
                                monitor.SslExpiresAt = message.SslExpiresAt;
                                await context.SaveChangesAsync(stoppingToken);

                                var sslAlert = scope.ServiceProvider.GetRequiredService<SslExpiryAlertService>();
                                await sslAlert.CheckAndNotifyAsync(context, monitor.Id, stoppingToken);
                            }
                        }
                    }
                    else if (topic == "uptime/ping/responses")
                    {
                        var response = JsonSerializer.Deserialize<MqttPingPreviewResponseDto>(payload);

                        if (response == null || string.IsNullOrWhiteSpace(response.RequestId))
                        {
                            Console.WriteLine("Invalid ping preview response payload.");
                            return;
                        }

                        var completed = PingPreviewService.TryCompleteRequest(response);

                        if (!completed)
                        {
                            Console.WriteLine($"No pending preview request found for RequestId: {response.RequestId}");
                        }
                    }
                    else if (topic == "uptime/update_favicon")
                    {
                        var faviconMessage = JsonSerializer.Deserialize<MqttFaviconUpdateDto>(payload);

                        if (faviconMessage == null)
                        {
                            Console.WriteLine("Favicon payload kunne ikke deserialize.");
                            return;
                        }

                        if (faviconMessage.MonitorId <= 0 || string.IsNullOrWhiteSpace(faviconMessage.Favicon))
                        {
                            Console.WriteLine("Invalid favicon payload.");
                            return;
                        }

                        using var scope = _scopeFactory.CreateScope();
                        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                        var monitor = await context.Monitors
                            .FirstOrDefaultAsync(
                                m => m.Id == faviconMessage.MonitorId && m.UserId == faviconMessage.UserId,
                                stoppingToken);

                        if (monitor == null)
                        {
                            Console.WriteLine($"Monitor ikke fundet. Id={faviconMessage.MonitorId}");
                            return;
                        }

                        monitor.FaviconBase64 = faviconMessage.Favicon;
                        context.Entry(monitor).Property(m => m.FaviconBase64).IsModified = true;
                        await context.SaveChangesAsync(stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error processing MQTT message: {ex.Message}");
                }
            };

            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(host, port)
                .Build();

            try
            {
                await _client.ConnectAsync(options, stoppingToken);
                await _client.SubscribeAsync("uptime/measurements", cancellationToken: stoppingToken);
                await _client.SubscribeAsync("uptime/ping/responses", cancellationToken: stoppingToken);
                await _client.SubscribeAsync("uptime/update_favicon", cancellationToken: stoppingToken);

                Console.WriteLine("MQTT connected and subscribed.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MQTT failed to connect: {ex.Message}");
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }
        }
    }
}
