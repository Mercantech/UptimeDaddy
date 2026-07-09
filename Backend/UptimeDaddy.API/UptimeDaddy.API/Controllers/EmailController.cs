using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Models;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmailController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;

    public EmailController(AppDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    private bool TryGetUserId(out long userId)
    {
        userId = 0;
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrWhiteSpace(claim) && long.TryParse(claim, out userId);
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized("Kunne ikke finde bruger-id i token.");

        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        var preference = await _db.EmailNotificationPreferences.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        return Ok(new
        {
            email = user.Email,
            enabled = preference?.Enabled ?? true,
            configured = _emailService.IsConfigured
        });
    }

    [HttpPut("notifications")]
    public async Task<IActionResult> UpsertNotifications([FromBody] UpsertEmailNotificationsDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized("Kunne ikke finde bruger-id i token.");

        var exists = await _db.Users.AnyAsync(u => u.Id == userId);
        if (!exists)
            return BadRequest("Account findes ikke.");

        var entity = await _db.EmailNotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        var now = DateTime.UtcNow;

        if (entity == null)
        {
            entity = new EmailNotificationPreference
            {
                UserId = userId,
                Enabled = dto.Enabled,
                UpdatedAt = now
            };
            _db.EmailNotificationPreferences.Add(entity);
        }
        else
        {
            entity.Enabled = dto.Enabled;
            entity.UpdatedAt = now;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            enabled = entity.Enabled,
            configured = _emailService.IsConfigured
        });
    }

    public sealed class UpsertEmailNotificationsDto
    {
        public bool Enabled { get; set; } = true;
    }
}
