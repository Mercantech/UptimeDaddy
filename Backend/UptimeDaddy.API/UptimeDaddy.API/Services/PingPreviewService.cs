using System.Collections.Concurrent;
using UptimeDaddy.API.DTOs;

namespace UptimeDaddy.API.Services
{
    public class PingPreviewService
    {
        private readonly IMqttPublishService _mqttPublishService;

        private static readonly ConcurrentDictionary<string, TaskCompletionSource<MqttPingPreviewResponseDto>> _pendingRequests
            = new();

        public PingPreviewService(IMqttPublishService mqttPublishService)
        {
            _mqttPublishService = mqttPublishService;
        }

        public async Task<MqttPingPreviewResponseDto?> SendPreviewPingAsync(
            string url,
            CancellationToken cancellationToken = default)
        {
            var requestId = Guid.NewGuid().ToString();

            var tcs = new TaskCompletionSource<MqttPingPreviewResponseDto>(
                TaskCreationOptions.RunContinuationsAsynchronously);

            if (!_pendingRequests.TryAdd(requestId, tcs))
            {
                throw new Exception("Could not register preview request.");
            }

            try
            {
                await _mqttPublishService.PublishPingPreviewAsync(requestId, url);

                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(10));

                using var registration = timeoutCts.Token.Register(() =>
                {
                    if (_pendingRequests.TryRemove(requestId, out var pending))
                    {
                        pending.TrySetCanceled();
                    }
                });

                return await tcs.Task;
            }
            catch
            {
                _pendingRequests.TryRemove(requestId, out _);
                throw;
            }
        }

        public static bool TryCompleteRequest(MqttPingPreviewResponseDto response)
        {
            if (_pendingRequests.TryRemove(response.RequestId, out var tcs))
            {
                return tcs.TrySetResult(response);
            }

            return false;
        }
    }
}