using AuthWebApi.Entities;

namespace AuthWebApi.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
        RefreshToken GenerateRefreshToken(string ipAddress);
    }
}
