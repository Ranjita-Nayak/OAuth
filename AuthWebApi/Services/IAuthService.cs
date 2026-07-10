using System.Threading.Tasks;
using AuthWebApi.Models.Dto;

namespace AuthWebApi.Services
{
    public interface IAuthService
    {
        Task<bool> RegisterAsync(UserRegisterDto registerDto);
        Task<TokenResponseDto?> LoginAsync(UserLoginDto loginDto, string ipAddress);
        Task<TokenResponseDto?> ExternalLoginAsync(string email, string username, string provider, string providerKey, string ipAddress);
        Task<TokenResponseDto?> RefreshTokenAsync(string token, string ipAddress);
        Task<bool> RevokeTokenAsync(string token, string ipAddress);
    }
}
