using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requires a valid JWT token
    public class ProtectedController : ControllerBase
    {
        [HttpGet("test")]
        public IActionResult Test()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            return Ok(new
            {
                message = "You have successfully accessed a protected endpoint!",
                user = new
                {
                    UserId = userId,
                    Username = username,
                    Email = email,
                    Role = role
                }
            });
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")] // Requires Admin role specifically
        public IActionResult AdminOnly()
        {
            return Ok(new
            {
                message = "Congratulations! You have accessed an Admin-only endpoint."
            });
        }
    }
}
