using UptimeDaddy.API.Models;

namespace UptimeDaddy.API.Services
{
    public static class MonitorStatusEvaluator
    {
        public static bool IsUp(int statusCode) => statusCode >= 200 && statusCode < 300;

        public static bool IsMeasurementUp(Measurement m)
        {
            if (!IsUp(m.StatusCode))
                return false;
            if (m.KeywordMatched.HasValue && !m.KeywordMatched.Value)
                return false;
            return true;
        }
    }
}
