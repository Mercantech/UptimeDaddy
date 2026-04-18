using UptimeDaddy.API.Services;
using Xunit;

namespace UptimeDaddy.API.Tests
{
    public class MonitorStatusEvaluatorTests
    {
        [Theory]
        [InlineData(200, true)]
        [InlineData(204, true)]
        [InlineData(299, true)]
        [InlineData(199, false)]
        [InlineData(300, false)]
        [InlineData(404, false)]
        [InlineData(500, false)]
        [InlineData(0, false)]
        public void IsUp_MatchesHttpSuccessRange(int statusCode, bool expected)
        {
            Assert.Equal(expected, MonitorStatusEvaluator.IsUp(statusCode));
        }
    }
}
