namespace UptimeDaddy.API.Services
{
    public static class MonitorStatusEvaluator
    {
        public static bool IsUp(int statusCode) => statusCode >= 200 && statusCode < 300;
    }
}
