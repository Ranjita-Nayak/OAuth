using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Auth.Application.DTOs;
using Auth.Application.Interfaces;
using Microsoft.AspNetCore.Authentication;
using System.Linq;
namespace AuthWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto registerDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.RegisterAsync(registerDto);
            if (!result)
            {
                return BadRequest(new { message = "Username or Email is already taken." });
            }

            return Ok(new { message = "Registration successful." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var ipAddress = GetIpAddress();
            var response = await _authService.LoginAsync(loginDto, ipAddress);

            if (response == null)
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            // Set refresh token in HttpOnly cookie for extra security
            SetRefreshTokenCookie(response.RefreshToken, response.RefreshTokenExpiration);

            return Ok(response);
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest? request)
        {
            // Get token either from request body or from HttpOnly cookie
            var token = request?.RefreshToken ?? Request.Cookies["refreshToken"];

            if (string.IsNullOrEmpty(token))
            {
                return BadRequest(new { message = "Refresh token is required." });
            }

            var ipAddress = GetIpAddress();
            var response = await _authService.RefreshTokenAsync(token, ipAddress);

            if (response == null)
            {
                return Unauthorized(new { message = "Invalid or expired refresh token." });
            }

            SetRefreshTokenCookie(response.RefreshToken, response.RefreshTokenExpiration);
            return Ok(response);
        }

        [HttpPost("revoke-token")]
        public async Task<IActionResult> RevokeToken([FromBody] RefreshTokenRequest? request)
        {
            // Get token either from request body or from HttpOnly cookie
            var token = request?.RefreshToken ?? Request.Cookies["refreshToken"];

            if (string.IsNullOrEmpty(token))
            {
                return BadRequest(new { message = "Refresh token is required." });
            }

            var ipAddress = GetIpAddress();
            var result = await _authService.RevokeTokenAsync(token, ipAddress);

            if (!result)
            {
                return NotFound(new { message = "Refresh token not found or already inactive." });
            }

            // Clear the cookie
            Response.Cookies.Delete("refreshToken");

            return Ok(new { message = "Token successfully revoked." });
        }

        [HttpGet("google-login")]
        public IActionResult GoogleLogin()
        {
            var properties = new AuthenticationProperties
            {
                RedirectUri = Url.Action("GoogleCallback")
            };
            return Challenge(properties, "Google");
        }

        [HttpGet("google-callback")]
        public async Task<IActionResult> GoogleCallback()
        {
            var authenticateResult = await HttpContext.AuthenticateAsync("ExternalCookie");
            
            if (!authenticateResult.Succeeded)
            {
                return BadRequest(new { message = "OAuth authentication failed." });
            }

            var claims = authenticateResult.Principal.Identities.FirstOrDefault()?.Claims;
            var email = claims?.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
            var name = claims?.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Name)?.Value;
            var providerKey = claims?.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(providerKey))
            {
                return BadRequest(new { message = "Could not retrieve user info from provider." });
            }

            // Clean up temporary cookie
            await HttpContext.SignOutAsync("ExternalCookie");

            var ipAddress = GetIpAddress();
            var response = await _authService.ExternalLoginAsync(email, name ?? email, "Google", providerKey, ipAddress);

            if (response == null)
            {
                return Unauthorized(new { message = "OAuth login failed." });
            }

            SetRefreshTokenCookie(response.RefreshToken, response.RefreshTokenExpiration);
            return Ok(response);
        }

        #region Helper Methods

        private void SetRefreshTokenCookie(string token, DateTime expires)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Expires = expires,
                Secure = true, // Set to true in production
                SameSite = SameSiteMode.Strict
            };
            Response.Cookies.Append("refreshToken", token, cookieOptions);
        }

        private string GetIpAddress()
        {
            // Check headers first (in case of reverse proxy)
            if (Request.Headers.ContainsKey("X-Forwarded-For"))
            {
                return Request.Headers["X-Forwarded-For"].ToString();
            }
            
            return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "127.0.0.1";
        }

        #endregion
    }
}
