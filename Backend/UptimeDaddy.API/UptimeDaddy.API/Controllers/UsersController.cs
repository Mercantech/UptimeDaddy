using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeDaddy.API.Data;

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
                .Include(u => u.Websites)
                .Select(u => new
                {
                    name = u.Fullname,
                    email = u.Email,
                    pages = u.Websites.Select(w => new
                    {
                        path = w.Url,
                        interval_time = w.IntervalTime
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new { users });
        }
    }
}