using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.DTOs;
using UptimeDaddy.API.Models;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/dashboard-boards")]
    [Authorize]
    public class DashboardBoardsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardBoardsController(AppDbContext context)
        {
            _context = context;
        }

        private bool TryGetUserId(out long userId)
        {
            userId = 0;
            var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return !string.IsNullOrWhiteSpace(raw) && long.TryParse(raw, out userId);
        }

        /// <summary>Dashboard-navn bruges som unikt ID pr. bruger (gemmes normaliseret).</summary>
        private static string NormalizeBoardName(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return string.Empty;
            return raw.Trim().ToLowerInvariant();
        }

        private async Task<bool> BoardNameTakenAsync(long userId, string normalizedName, long? excludeBoardId = null)
        {
            if (string.IsNullOrEmpty(normalizedName))
                return false;

            return await _context.DashboardBoards
                .AsNoTracking()
                .AnyAsync(b =>
                    b.UserId == userId
                    && b.Name == normalizedName
                    && (!excludeBoardId.HasValue || b.Id != excludeBoardId.Value));
        }

        [HttpGet]
        public async Task<IActionResult> List()
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var boards = await _context.DashboardBoards
                .AsNoTracking()
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.UpdatedAt)
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    b.ShareToken,
                    b.IsPublished,
                    b.CreatedAt,
                    b.UpdatedAt,
                    itemCount = b.Items.Count,
                })
                .ToListAsync();

            return Ok(boards);
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var board = await _context.DashboardBoards
                .AsNoTracking()
                .Include(b => b.Items)
                .Where(b => b.Id == id && b.UserId == userId)
                .FirstOrDefaultAsync();

            if (board == null)
                return NotFound("Board blev ikke fundet.");

            var ordered = board.Items.OrderBy(i => i.SortOrder).ToList();

            return Ok(new
            {
                board.Id,
                board.Name,
                board.ShareToken,
                board.IsPublished,
                board.CreatedAt,
                board.UpdatedAt,
                items = ordered.Select(i => new
                {
                    i.Id,
                    i.WebsiteId,
                    i.SortOrder,
                    i.DisplayLabel,
                }),
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDashboardBoardDto? dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var name = NormalizeBoardName(dto?.Name);
            if (string.IsNullOrEmpty(name))
                return BadRequest(new { message = "Dashboard-ID (navn) er påkrævet og må ikke kun være mellemrum." });

            if (await BoardNameTakenAsync(userId, name))
                return Conflict(new { message = $"Dashboard-ID \"{name}\" findes allerede. Vælg et andet navn." });

            var now = DateTime.UtcNow;

            var board = new DashboardBoard
            {
                UserId = userId,
                Name = name,
                ShareToken = ShareTokenGenerator.CreateToken(),
                IsPublished = false,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _context.DashboardBoards.Add(board);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                board.Id,
                board.Name,
                board.ShareToken,
                board.IsPublished,
                board.CreatedAt,
                board.UpdatedAt,
                items = Array.Empty<object>(),
            });
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateDashboardBoardDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            if (dto == null)
                return BadRequest("Body mangler.");

            var name = NormalizeBoardName(dto.Name);
            if (string.IsNullOrEmpty(name))
                return BadRequest(new { message = "Dashboard-ID (navn) er påkrævet og må ikke kun være mellemrum." });

            var board = await _context.DashboardBoards
                .Include(b => b.Items)
                .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

            if (board == null)
                return NotFound("Board blev ikke fundet.");

            if (await BoardNameTakenAsync(userId, name, board.Id))
                return Conflict(new { message = $"Dashboard-ID \"{name}\" findes allerede. Vælg et andet navn." });

            var itemDtos = dto.Items ?? new List<DashboardBoardItemUpdateDto>();
            var websiteIds = itemDtos.Select(i => i.WebsiteId).Distinct().ToList();

            if (websiteIds.Count != itemDtos.Count)
                return BadRequest("Samme website må ikke forekomme flere gange.");

            if (websiteIds.Count > 0)
            {
                var owned = await _context.Websites
                    .Where(w => w.UserId == userId && websiteIds.Contains(w.Id))
                    .Select(w => w.Id)
                    .ToListAsync();

                if (owned.Count != websiteIds.Count)
                    return BadRequest("Et eller flere websites tilhører ikke dig.");
            }

            board.Name = name;
            board.IsPublished = dto.IsPublished;
            board.UpdatedAt = DateTime.UtcNow;

            _context.DashboardBoardItems.RemoveRange(board.Items);

            var order = 0;
            foreach (var row in itemDtos.OrderBy(i => i.SortOrder))
            {
                _context.DashboardBoardItems.Add(new DashboardBoardItem
                {
                    DashboardBoardId = board.Id,
                    WebsiteId = row.WebsiteId,
                    SortOrder = order++,
                    DisplayLabel = string.IsNullOrWhiteSpace(row.DisplayLabel) ? null : row.DisplayLabel.Trim(),
                });
            }

            await _context.SaveChangesAsync();

            return await GetById(id);
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized("Kunne ikke finde bruger-id i token.");

            var board = await _context.DashboardBoards
                .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

            if (board == null)
                return NotFound("Board blev ikke fundet.");

            _context.DashboardBoards.Remove(board);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
