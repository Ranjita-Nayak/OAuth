using System;
using System.Collections.Generic;

namespace AuthWebApi.Entities
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public byte[] PasswordHash { get; set; } = Array.Empty<byte>();
        public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();
        public string Role { get; set; } = "User";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // OAuth properties
        public string AuthProvider { get; set; } = "Local";
        public string? ProviderKey { get; set; }

        // Navigation property for EF Core
        public List<RefreshToken> RefreshTokens { get; set; } = new();
    }
}
