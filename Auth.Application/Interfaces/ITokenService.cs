using Auth.Domain.Entities;

namespace Auth.Application.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
        RefreshToken GenerateRefreshToken(string ipAddress);
    }
}
