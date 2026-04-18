using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Net.Sockets;

namespace UptimeDaddy.API.HealthChecks
{
    public class MqttHealthCheck : IHealthCheck
    {
        private readonly IConfiguration _configuration;

        public MqttHealthCheck(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            var host = _configuration["Mqtt:Host"];
            var portStr = _configuration["Mqtt:Port"] ?? "1883";

            if (string.IsNullOrWhiteSpace(host) || !int.TryParse(portStr, out var port))
            {
                return HealthCheckResult.Unhealthy("MQTT host/port not configured.");
            }

            try
            {
                using var tcp = new TcpClient();
                var connectTask = tcp.ConnectAsync(host, port);
                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
                var completed = await Task.WhenAny(connectTask, timeoutTask);
                if (completed == timeoutTask || !tcp.Connected)
                    return HealthCheckResult.Unhealthy("Unable to connect to MQTT broker.");

                return HealthCheckResult.Healthy("MQTT reachable.");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy($"MQTT connection failed: {ex.Message}");
            }
        }
    }
}