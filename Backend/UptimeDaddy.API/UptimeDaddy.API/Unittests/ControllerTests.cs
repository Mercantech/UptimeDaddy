using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using UptimeDaddy.API.Controllers;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs;
using UptimeDaddy.API.Models;
using UptimeDaddy.API.Services;
using Xunit;

namespace UptimeDaddy.API.Unittests
{
    public class ControllerTests
    {       
        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenDtoIsNull()
        {
            // Arrange
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: "CreateTestDb1")
                .Options;

            await using var context = new AppDbContext(options);

            var mqttMock = new Mock<IMqttPublishService>(MockBehavior.Loose);
            mqttMock.Setup(m => m.PublishWebsiteCreatedAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<string>(), It.IsAny<int>()))
                    .Returns(Task.CompletedTask);

            var controller = new WebsitesController(context, mqttMock.Object);

            // Act
            var result = await controller.Create(null!);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UpdateInterval_ShouldReturnNotFound_WhenWebsiteDoesNotExist()
        {
            // Arrange
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: "UpdateIntervalTestDb1")
                .Options;

            await using var context = new AppDbContext(options);

            var mqttMock = new Mock<IMqttPublishService>(MockBehavior.Loose);
            mqttMock.Setup(m => m.PublishWebsiteUpdatedAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<string>(), It.IsAny<int>()))
                    .Returns(Task.CompletedTask);

            var controller = new WebsitesController(context, mqttMock.Object);

            var dto = new UpdateWebsiteIntervalDto { IntervalTime = 30 };

            // Act
            var result = await controller.UpdateInterval(12345, dto);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }
    }
}
