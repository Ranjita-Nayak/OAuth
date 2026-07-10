using System;
using System.Data;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Dapper;
using Microsoft.EntityFrameworkCore;
using AuthWebApi.Data;
using AuthWebApi.Entities;
using AuthWebApi.Models.Dto;

namespace AuthWebApi.Services
{
    public class AuthService : IAuthService
    {
        private readonly AuthDbContext _dbContext;
        private readonly DapperContext _dapperContext;
        private readonly ITokenService _tokenService;

        public AuthService(
            AuthDbContext dbContext,
            DapperContext dapperContext,
            ITokenService tokenService)
        {
            _dbContext = dbContext;
            _dapperContext = dapperContext;
            _tokenService = tokenService;
        }

        public async Task<bool> RegisterAsync(UserRegisterDto registerDto)
        {
            // 1. Dapper Read: Check if user already exists
            const string checkUserSql = @"
                SELECT COUNT(1) 
                FROM Users 
                WHERE Username = @Username OR Email = @Email";

            using (var connection = _dapperContext.CreateConnection())
            {
                int count = await connection.ExecuteScalarAsync<int>(checkUserSql, new
                {
                    registerDto.Username,
                    registerDto.Email
                });

                if (count > 0)
                {
                    return false; // User already exists
                }
            }

            // 2. Cryptography: Create password hash and salt
            CreatePasswordHash(registerDto.Password, out byte[] passwordHash, out byte[] passwordSalt);

            var user = new User
            {
                Username = registerDto.Username,
                Email = registerDto.Email,
                PasswordHash = passwordHash,
                PasswordSalt = passwordSalt,
                Role = string.IsNullOrWhiteSpace(registerDto.Role) ? "User" : registerDto.Role,
                CreatedAt = DateTime.UtcNow
            };

            // 3. EF Core Write: Persist new user entity
            _dbContext.Users.Add(user);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        public async Task<TokenResponseDto?> LoginAsync(UserLoginDto loginDto, string ipAddress)
        {
            // 1. Dapper Read: Fetch user by username (high-performance read)
            const string fetchUserSql = "SELECT * FROM Users WHERE Username = @Username";
            User? user;

            using (var connection = _dapperContext.CreateConnection())
            {
                user = await connection.QuerySingleOrDefaultAsync<User>(fetchUserSql, new { loginDto.Username });
            }

            if (user == null)
            {
                return null; // User not found
            }

            // 2. Cryptography: Verify password hash
            if (!VerifyPasswordHash(loginDto.Password, user.PasswordHash, user.PasswordSalt))
            {
                return null; // Invalid password
            }

            // 3. Token Services: Generate Access Token and Refresh Token
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken(ipAddress);
            refreshToken.UserId = user.Id;

            // 4. EF Core Write: Save refresh token to database
            _dbContext.RefreshTokens.Add(refreshToken);
            await _dbContext.SaveChangesAsync();

            return new TokenResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token,
                RefreshTokenExpiration = refreshToken.Expires
            };
        }

        public async Task<TokenResponseDto?> ExternalLoginAsync(string email, string username, string provider, string providerKey, string ipAddress)
        {
            // 1. Dapper Read: Check if user exists by ProviderKey or Email
            const string fetchUserSql = "SELECT * FROM Users WHERE ProviderKey = @ProviderKey OR Email = @Email";
            User? user;

            using (var connection = _dapperContext.CreateConnection())
            {
                user = await connection.QueryFirstOrDefaultAsync<User>(fetchUserSql, new { ProviderKey = providerKey, Email = email });
            }

            if (user == null)
            {
                // Create a new user if they don't exist
                user = new User
                {
                    Username = username,
                    Email = email,
                    Role = "User",
                    CreatedAt = DateTime.UtcNow,
                    AuthProvider = provider,
                    ProviderKey = providerKey
                };

                _dbContext.Users.Add(user);
                await _dbContext.SaveChangesAsync();
            }
            else if (user.AuthProvider != provider)
            {
                // Link account if they signed in via another method but same email
                user.AuthProvider = provider;
                user.ProviderKey = providerKey;
                _dbContext.Users.Update(user);
                await _dbContext.SaveChangesAsync();
            }

            // 3. Token Services: Generate Access Token and Refresh Token
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken(ipAddress);
            refreshToken.UserId = user.Id;

            // 4. EF Core Write: Save refresh token to database
            _dbContext.RefreshTokens.Add(refreshToken);
            await _dbContext.SaveChangesAsync();

            return new TokenResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token,
                RefreshTokenExpiration = refreshToken.Expires
            };
        }

        public async Task<TokenResponseDto?> RefreshTokenAsync(string token, string ipAddress)
        {
            // 1. Dapper Read: Fetch Refresh Token with User details (Join Query)
            const string fetchTokenSql = @"
                SELECT rt.*, u.* 
                FROM RefreshTokens rt 
                INNER JOIN Users u ON rt.UserId = u.Id 
                WHERE rt.Token = @Token";

            RefreshToken? refreshToken;
            using (var connection = _dapperContext.CreateConnection())
            {
                var result = await connection.QueryAsync<RefreshToken, User, RefreshToken>(
                    fetchTokenSql,
                    (rt, u) =>
                    {
                        rt.User = u;
                        return rt;
                    },
                    new { Token = token },
                    splitOn: "Id"
                );
                refreshToken = result.FirstOrDefault();
            }

            if (refreshToken == null)
            {
                return null; // Token not found
            }

            // 2. Token Security: Token Reuse Detection
            if (refreshToken.IsRevoked)
            {
                // Attack Scenario: Token was already used/compromised. 
                // Revoke ALL active tokens for this user for security.
                await RevokeAllUserTokensAsync(refreshToken.UserId, ipAddress, $"Attempted reuse of revoked token: {token}");
                return null;
            }

            if (refreshToken.IsExpired)
            {
                return null; // Expired token
            }

            // 3. Token Services: Generate rotated token pair
            var newRefreshToken = _tokenService.GenerateRefreshToken(ipAddress);
            newRefreshToken.UserId = refreshToken.UserId;

            // 4. Update old token state to Revoked/Replaced
            refreshToken.Revoked = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress;
            refreshToken.ReplacedByToken = newRefreshToken.Token;

            // 5. EF Core Write: Track changes and persist in single transaction
            // Attach Dapper-fetched entity to EF DbContext context to start tracking changes
            _dbContext.Attach(refreshToken);
            _dbContext.Entry(refreshToken).State = EntityState.Modified;
            
            // Add new token
            _dbContext.RefreshTokens.Add(newRefreshToken);
            await _dbContext.SaveChangesAsync();

            // Generate new Access Token
            var accessToken = _tokenService.GenerateAccessToken(refreshToken.User);

            return new TokenResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken.Token,
                RefreshTokenExpiration = newRefreshToken.Expires
            };
        }

        public async Task<bool> RevokeTokenAsync(string token, string ipAddress)
        {
            // 1. EF Core Read & Track: Since we will modify it directly, let's load it via EF Core.
            // (Alternatively, could fetch via Dapper and attach, but loading here shows standard EF Core usage)
            var refreshToken = await _dbContext.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == token);

            if (refreshToken == null || !refreshToken.IsActive)
            {
                return false; // Token not found or already inactive
            }

            // 2. Update status
            refreshToken.Revoked = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress;

            // 3. Save changes
            await _dbContext.SaveChangesAsync();
            return true;
        }

        #region Helper Methods

        private static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
        {
            using (var hmac = new HMACSHA512())
            {
                passwordSalt = hmac.Key;
                passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
            }
        }

        private static bool VerifyPasswordHash(string password, byte[] storedHash, byte[] storedSalt)
        {
            using (var hmac = new HMACSHA512(storedSalt))
            {
                var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
                return CryptographicOperations.FixedTimeEquals(computedHash, storedHash);
            }
        }

        private async Task RevokeAllUserTokensAsync(Guid userId, string ipAddress, string reason)
        {
            // Fetch all active tokens for the user and revoke them
            var activeTokens = await _dbContext.RefreshTokens
                .Where(rt => rt.UserId == userId && rt.Revoked == null && rt.Expires > DateTime.UtcNow)
                .ToListAsync();

            foreach (var token in activeTokens)
            {
                token.Revoked = DateTime.UtcNow;
                token.RevokedByIp = ipAddress;
                token.ReplacedByToken = reason;
            }

            await _dbContext.SaveChangesAsync();
        }

        #endregion
    }
}
