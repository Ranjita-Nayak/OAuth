# JWT & Refresh Token Authentication Module (.NET 9 + Dapper + EF Core)

This repository contains a secure, production-ready **User Registration and Login Module** built using ASP.NET Core (.NET 9 Web API), Entity Framework Core (for state and tracking), and Dapper (for high-performance data queries) with MS SQL Server.

This guide provides a comprehensive, step-by-step explanation of the architectural concepts, database schema, code structure, and testing procedures, so that anyone can read this document and recreate the system from scratch.

---

## 📖 Architectural Concepts

### 1. Why JWT + Refresh Tokens?
*   **Access Token (JWT)**: JSON Web Tokens are stateless. Once issued, the client sends this token in the `Authorization` header (`Bearer <token>`) for every request. The server verifies the token cryptographically without hitting the database. To minimize risk if intercepted, access tokens have a very short lifespan (e.g., 15 minutes).
*   **Refresh Token**: When the access token expires, hitting endpoints returns a `401 Unauthorized` response. Instead of forcing the user to log in again with credentials, the application sends a cryptographically secure, long-lived **Refresh Token** to obtain a new access token.
*   **Token Rotation**: Every time a refresh token is used, it is revoked, and a **new** refresh token is returned alongside the new access token. This prevents replay attacks.
*   **Token Reuse Detection**: If an attacker steals a refresh token and tries to reuse it after the user has already rotated it, the server detects the reuse of a revoked token. For security, the server automatically **revokes all active sessions** for that user, neutralizing the threat.

### 2. Combining EF Core and Dapper
*   **Entity Framework Core (EF Core)**: Excellent for mapping entity models, managing database migrations (code-first schema generation), and handling write operations where change-tracking, relational state management, and cascading deletes are essential (e.g., adding a user, attaching tokens, or saving updates).
*   **Dapper**: A lightweight micro-ORM that compiles high-performance direct SQL read queries. It is used for fast lookup operations where we do not need change-tracking (e.g., checking if a username exists, performing high-speed login lookups, or executing complex join queries such as mapping a token to its user).

---

## 🛠️ Step-by-Step Project Recreation Guide

Follow these steps to build this module from scratch on your own machine.

### Step 1: Create the Project and Solution
Open your terminal in your repository folder and run:

```bash
# 1. Create a Web API project with Controllers targeting .NET 9.0
dotnet new webapi -o AuthWebApi --use-controllers -f net9.0

# 2. Create a .NET Solution file
dotnet new sln -n AuthSolution

# 3. Add the Web API project to the solution
dotnet sln add AuthWebApi/AuthWebApi.csproj
```

### Step 2: Install NuGet Packages
Navigate to your project or use the CLI to add the required dependencies:

```bash
# EF Core and SQL Server Driver
dotnet add AuthWebApi/AuthWebApi.csproj package Microsoft.EntityFrameworkCore.SqlServer -v 9.0.0
dotnet add AuthWebApi/AuthWebApi.csproj package Microsoft.EntityFrameworkCore.Design -v 9.0.0
dotnet add AuthWebApi/AuthWebApi.csproj package Microsoft.EntityFrameworkCore.Tools -v 9.0.0

# Dapper Micro-ORM
dotnet add AuthWebApi/AuthWebApi.csproj package Dapper

# JWT Authentication Support
dotnet add AuthWebApi/AuthWebApi.csproj package Microsoft.AspNetCore.Authentication.JwtBearer -v 9.0.0
dotnet add AuthWebApi/AuthWebApi.csproj package System.IdentityModel.Tokens.Jwt

# Swagger UI for interactive testing
dotnet add AuthWebApi/AuthWebApi.csproj package Swashbuckle.AspNetCore -v 6.6.2
```

### Step 3: Configure Database & JWT in `appsettings.json`
Replace the contents of `appsettings.json` in the project root:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=AuthDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True;Encrypt=False"
  },
  "Jwt": {
    "Key": "SuperSecretKeyForJwtAuthentication9876543210!_VerySecure_KeyFor_HS256_Signatures",
    "Issuer": "AuthApi",
    "Audience": "AuthUsers",
    "AccessTokenExpirationInMinutes": 15,
    "RefreshTokenExpirationInDays": 7
  }
}
```
*Note: In production, store the JWT Key and Connection String securely (e.g., Environment Variables or Key Vault).*

---

## 🗄️ Database Schema & Entities

Create a directory named `Entities` and add the following two class files:

### 1. `Entities/User.cs`
Represents the user account. We store the password as cryptographically secure byte arrays (`PasswordHash` and `PasswordSalt`) using HMACSHA512.

```csharp
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
        public string Role { get; set; } = "User"; // E.g., User, Admin
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property for EF Core
        public List<RefreshToken> RefreshTokens { get; set; } = new();
    }
}
```

### 2. `Entities/RefreshToken.cs`
Represents the refresh tokens linked to a user. Includes metadata like Client IP for security logs, replacement tracking, and helper properties to check validation.

```csharp
using System;
using System.Text.Json.Serialization;

namespace AuthWebApi.Entities
{
    public class RefreshToken
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime Expires { get; set; }
        public DateTime Created { get; set; } = DateTime.UtcNow;
        public string CreatedByIp { get; set; } = string.Empty;
        public DateTime? Revoked { get; set; }
        public string? RevokedByIp { get; set; }
        public string? ReplacedByToken { get; set; }

        public Guid UserId { get; set; }
        
        [JsonIgnore] // Avoid circular JSON references
        public User User { get; set; } = null!;

        public bool IsExpired => DateTime.UtcNow >= Expires;
        public bool IsRevoked => Revoked != null;
        public bool IsActive => !IsRevoked && !IsExpired;
    }
}
```

---

## 💾 Data Access Configurations

Create a directory named `Data` and configure EF Core and Dapper:

### 1. `Data/AuthDbContext.cs` (EF Core)
Maps our entities to the tables and sets database-level constraints (like unique indexes on `Username` and `Email` and cascade deletion).

```csharp
using Microsoft.EntityFrameworkCore;
using AuthWebApi.Entities;

namespace AuthWebApi.Data
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) {}

        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(u => u.Id);
                entity.Property(u => u.Username).IsRequired().HasMaxLength(100);
                entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
                entity.Property(u => u.Role).HasMaxLength(50).HasDefaultValue("User");
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.Email).IsUnique();
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.ToTable("RefreshTokens");
                entity.HasKey(rt => rt.Id);
                entity.Property(rt => rt.Token).IsRequired().HasMaxLength(200);
                entity.Property(rt => rt.CreatedByIp).HasMaxLength(100);
                entity.Property(rt => rt.RevokedByIp).HasMaxLength(100);
                entity.Property(rt => rt.ReplacedByToken).HasMaxLength(200);
                entity.HasIndex(rt => rt.Token);

                entity.HasOne(rt => rt.User)
                    .WithMany(u => u.RefreshTokens)
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
```

### 2. `Data/DapperContext.cs` (Dapper)
Provides a lightweight DB connection factory to spin up quick SQL connections using the connection string.

```csharp
using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace AuthWebApi.Data
{
    public class DapperContext
    {
        private readonly IConfiguration _configuration;
        private readonly string _connectionString;

        public DapperContext(IConfiguration configuration)
        {
            _configuration = configuration;
            _connectionString = _configuration.GetConnectionString("DefaultConnection") 
                ?? throw new System.InvalidOperationException("Connection string 'DefaultConnection' not found.");
        }

        public IDbConnection CreateConnection()
        {
            return new SqlConnection(_connectionString);
        }
    }
}
```

---

## 🛡️ Authentication & Token Services

Create a directory named `Models` with a subfolder `Dto`, and a directory named `Services`. Add the following components:

### 1. Configurations and DTOs
*   `Models/JwtSettings.cs`: Used to map config options in `Program.cs`.
*   `Models/Dto/UserRegisterDto.cs`: For parsing registration input (with validation annotations).
*   `Models/Dto/UserLoginDto.cs`: For parsing login input.
*   `Models/Dto/TokenResponseDto.cs`: Structure returned on successful login or refresh.
*   `Models/Dto/RefreshTokenRequest.cs`: Payload for token renewal.

### 2. Token Service (`Services/TokenService.cs`)
Generates JWT Access Tokens containing user claims (Id, Username, Email, Role) and cryptographically secure random Refresh Tokens.

```csharp
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using AuthWebApi.Entities;
using AuthWebApi.Models;

namespace AuthWebApi.Services
{
    public class TokenService : ITokenService
    {
        private readonly JwtSettings _jwtSettings;

        public TokenService(IOptions<JwtSettings> jwtSettings)
        {
            _jwtSettings = jwtSettings.Value;
        }

        public string GenerateAccessToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSettings.Key);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationInMinutes),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public RefreshToken GenerateRefreshToken(string ipAddress)
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);

            return new RefreshToken
            {
                Token = Convert.ToBase64String(randomNumber),
                Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays),
                Created = DateTime.UtcNow,
                CreatedByIp = ipAddress
            };
        }
    }
}
```

### 3. Authentication Service (`Services/AuthService.cs`)
Coordinates database and authentication flows:
1.  **Register**: Checks if the user exists using **Dapper** (fast SQL check) and adds the new user using **EF Core**.
2.  **Login**: Validates credentials and writes the initial refresh token using **EF Core**.
3.  **Refresh**: Uses **Dapper** with a Multi-Mapping join query (`QueryAsync<RefreshToken, User, RefreshToken>`) to load the token and user. If reuse is detected, it automatically revokes all user sessions. If valid, updates status and inserts a new token.
4.  **Revoke**: Loads the token using **EF Core** to mark it as revoked.

---

## 🎛️ API Controllers

Create the API endpoints inside the `Controllers/` directory:

### 1. `Controllers/AuthController.cs`
Handles HTTP routing, cookie setup, IP address extraction, and body model verification.

*   `POST /api/auth/register`: Register user.
*   `POST /api/auth/login`: Authenticate credentials, set HttpOnly token cookie, and return token details.
*   `POST /api/auth/refresh-token`: Renew JWT access tokens.
*   `POST /api/auth/revoke-token`: Revoke an active refresh token.

### 2. `Controllers/ProtectedController.cs`
Secured endpoints to demonstrate authentication claims validation.
*   `GET /api/protected/test`: Accessible by any authenticated user. Returns claim details.
*   `GET /api/protected/admin`: Accessible only to users holding the role `Admin`.

---

## 🚀 Running and Testing the Application

### 1. Set Up EF Migrations
Make sure you install the `dotnet-ef` global tool first, then apply migrations to LocalDB SQL Server:

```bash
# Install EF CLI tools globally
dotnet tool install --global dotnet-ef

# Add initial migrations
dotnet ef migrations add InitialCreate --project AuthWebApi/AuthWebApi.csproj

# Create the database schema
dotnet ef database update --project AuthWebApi/AuthWebApi.csproj
```

### 2. Run the Application
Start the Web API application:

```bash
dotnet run --project AuthWebApi/AuthWebApi.csproj
```

The console will display the URLs (e.g., `https://localhost:7080`).

### 3. Interactive Testing in Swagger UI
Open your browser and navigate to:
**`https://localhost:<port>/swagger`** (replace `<port>` with the port in your terminal).

#### Test Scenario 1: User Registration
1.  Locate `POST /api/auth/register`.
2.  Click **Try it out** and paste the JSON:
    ```json
    {
      "username": "developer",
      "email": "dev@authapi.com",
      "password": "Password123!",
      "role": "Admin"
    }
    ```
3.  Click **Execute**. A `200 OK` indicates registration success.

#### Test Scenario 2: Logging In
1.  Locate `POST /api/auth/login`.
2.  Input your registration credentials.
3.  Click **Execute**.
4.  Copy the `accessToken` string from the JSON response body.
5.  Look at your response headers—you will see a `Set-Cookie` header storing the HTTP-only `refreshToken`.

#### Test Scenario 3: Accessing Protected Endpoints
1.  At the top of the Swagger UI page, click the **Authorize** button.
2.  In the textbox, write: `Bearer <accessToken>` (replace `<accessToken>` with the token string you copied).
3.  Click **Authorize** and close the modal.
4.  Locate `GET /api/protected/test` and click **Execute**. You will receive a `200 OK` showing your decoded claims.
5.  Locate `GET /api/protected/admin`. Since your role is `Admin`, it returns `200 OK`.

#### Test Scenario 4: Token Rotation (Refresh)
1.  Locate `POST /api/auth/refresh-token`.
2.  Leave the body parameter empty (or `{}`), as the API automatically fallback-checks your browser's HttpOnly cookie for the token.
3.  Click **Execute**. The API returns a new access token and updates the refresh token cookie.

#### Test Scenario 5: Revoking / Logging Out
1.  Locate `POST /api/auth/revoke-token`.
2.  Execute it.
3.  Now, attempt to call `GET /api/protected/test` or refresh again. The request is denied, demonstrating successful session termination.

---

## 🛠️ Troubleshooting

### 1. File Locking Errors in VS Code
If you encounter a build error stating:
> `The process cannot access the file ... AuthWebApi.exe because it is being used by another process.`

This happens if the application is already running in a hidden background terminal or you launched it twice. 
**Solution:**
Open your terminal and forcefully stop running instances using:
```bash
# Windows PowerShell
Stop-Process -Name AuthWebApi -Force
```
After the lock is released, use the **Run and Debug** tab (`F5`) in VS Code to cleanly run your application.

### 2. Swagger "Failed to Fetch" Error
If you try testing an endpoint in Swagger and receive a generic `Failed to fetch` error message, this is typically a browser security issue caused by an untrusted HTTPS development certificate.

**Solution 1: Trust the Certificate**
Open your VS Code terminal and run:
```bash
dotnet dev-certs https --trust
```
*Note: This will prompt a Windows confirmation dialog. Click "Yes" to install the certificate, then restart your browser.*

**Solution 2: Proceed Manually via HTTPS**
Alternatively, make sure you access the HTTPS URL directly: `https://localhost:7059/swagger`
Your browser will warn that the connection is not private. Click **Advanced** -> **Proceed to localhost (unsafe)**. Once loaded via HTTPS, Swagger's background API calls will succeed.

---

## 🔐 Google OAuth Integration

This module has been upgraded to support **Google OAuth 2.0** for Single Sign-On (SSO). The architecture combines OAuth with our existing stateless JWT infrastructure so that you only need to use the `Bearer` token for API requests, regardless of whether the user signed in with a password or Google.

### How it Works
1. **Challenge**: The user navigates to `GET /api/auth/google-login`. The API responds with an OAuth Challenge, redirecting the browser to Google's consent screen.
2. **Callback**: After authenticating, Google redirects the user back to `GET /api/auth/google-callback` with an authorization code.
3. **Claim Extraction**: The API extracts the user's `Email`, `Name`, and unique `ProviderKey` (Google ID) from the temporary external cookie.
4. **Link/Register**: The API checks the database (via Dapper). If the user doesn't exist, it creates a new `User` record with `AuthProvider = "Google"`. If they do, it links the account.
5. **Issue Tokens**: The API issues our own standard Access Token and Refresh Token, returning them to the client just like a normal login. 

### Setting up Google Credentials
To make this work locally:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and configure the **OAuth consent screen**.
3. Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
4. Set Application type to **Web application**.
5. Add an **Authorized redirect URI**: `https://localhost:7059/api/auth/google-callback`
6. Copy the **Client ID** and **Client Secret**.
7. Open `appsettings.json` and replace the placeholder values under `Authentication:Google`.
