using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using UptimeDaddy.API.Controllers;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs;
using UptimeDaddy.API.Services;
using Xunit;

namespace UptimeDaddy.API.Unittests
{
    public class ControllerTests
    {
        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenDtoIsNull()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: "CreateTestDb1")
                .Options;

            await using var context = new AppDbContext(options);

            var mqttMock = new Mock<IMqttPublishService>(MockBehavior.Loose);
            mqttMock.Setup(m => m.PublishMonitorPathCreatedAsync(
                    It.IsAny<long>(), It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<bool>()))
                .Returns(Task.CompletedTask);

            var controller = new MonitorsController(
                context,
                mqttMock.Object,
                new MonitorDashboardService(context));

            var result = await controller.Create(null!);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UpdateInterval_ShouldReturnNotFound_WhenMonitorDoesNotExist()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: "UpdateIntervalTestDb1")
                .Options;

            await using var context = new AppDbContext(options);

            var mqttMock = new Mock<IMqttPublishService>(MockBehavior.Loose);
            mqttMock.Setup(m => m.PublishMonitorPathUpdatedAsync(
                    It.IsAny<long>(), It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<bool>()))
                .Returns(Task.CompletedTask);

            var controller = new MonitorsController(
                context,
                mqttMock.Object,
                new MonitorDashboardService(context));

            var dto = new UpdateMonitorIntervalDto { IntervalTime = 30 };

            var result = await controller.UpdateInterval(12345, dto);

            Assert.IsType<NotFoundObjectResult>(result);
        }
    }
}
