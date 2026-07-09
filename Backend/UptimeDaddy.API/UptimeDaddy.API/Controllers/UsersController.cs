using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;
using UptimeDaddy.API.Services;

namespace UptimeDaddy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Include(u => u.Monitors)
                .ThenInclude(m => m.Paths)
                .Select(u => new
                {
                    name = u.Fullname,
                    email = u.Email,
                    monitors = u.Monitors.Select(m => new
                    {
                        baseUrl = m.BaseUrl,
                        interval_time = m.IntervalTime,
                        paths = m.Paths.Select(p => p.Path).ToList()
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new { users });
        }
    }
}
