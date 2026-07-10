using Microsoft.EntityFrameworkCore;
using AuthWebApi.Entities;

namespace AuthWebApi.Data
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User Entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(u => u.Id);
                
                entity.Property(u => u.Username)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(u => u.Email)
                    .IsRequired()
                    .HasMaxLength(150);

                entity.Property(u => u.Role)
                    .HasMaxLength(50)
                    .HasDefaultValue("User");
                    
                entity.Property(u => u.AuthProvider)
                    .HasMaxLength(50)
                    .HasDefaultValue("Local");
                    
                entity.Property(u => u.ProviderKey)
                    .HasMaxLength(255);

                // Unique Indexes
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.Email).IsUnique();
            });

            // Configure RefreshToken Entity
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.ToTable("RefreshTokens");
                entity.HasKey(rt => rt.Id);

                entity.Property(rt => rt.Token)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(rt => rt.CreatedByIp)
                    .HasMaxLength(100);

                entity.Property(rt => rt.RevokedByIp)
                    .HasMaxLength(100);

                entity.Property(rt => rt.ReplacedByToken)
                    .HasMaxLength(200);

                entity.HasIndex(rt => rt.Token);

                // Configure 1-to-many User -> RefreshTokens relation
                entity.HasOne(rt => rt.User)
                    .WithMany(u => u.RefreshTokens)
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
