using Microsoft.EntityFrameworkCore;
using System;

namespace KikiAI;

public class KikiDbContext : DbContext
{
    public KikiDbContext(DbContextOptions<KikiDbContext> options) : base(options)
    {
    }

    public DbSet<ChatSessionEntity> ChatSessions { get; set; }
    public DbSet<MessageEntity> Messages { get; set; }
    public DbSet<ApiKeyEntity> ApiKeys { get; set; }
    public DbSet<UserEntity> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ChatSession configuration
        modelBuilder.Entity<ChatSessionEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(36);
            entity.Property(e => e.Title).HasMaxLength(500);
            entity.HasIndex(e => e.CreatedAt);
        });

        // Message configuration
        modelBuilder.Entity<MessageEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.HasIndex(e => e.SessionId);
            
            entity.HasOne<ChatSessionEntity>()
                .WithMany()
                .HasForeignKey(e => e.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ApiKey configuration
        modelBuilder.Entity<ApiKeyEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(36);
            entity.Property(e => e.Provider).HasMaxLength(50);
            entity.Property(e => e.Alias).HasMaxLength(200);
            entity.Property(e => e.KeyValue).HasMaxLength(500);
            entity.HasIndex(e => new { e.Provider, e.IsActive });
        });

        // User configuration
        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Login).HasMaxLength(100).IsRequired();
            entity.HasIndex(e => e.Login).IsUnique();
            entity.Property(e => e.UserName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(500);
            entity.Property(e => e.UserType).HasMaxLength(50).HasDefaultValue("user");
        });
    }
}

// Entity models
public class UserEntity
{
    public int Id { get; set; }
    public string Login { get; set; }
    public string UserName { get; set; }
    public string PasswordHash { get; set; }
    public string UserType { get; set; } = "user";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ChatSessionEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Title { get; set; } = "Nový chat";
    public int TotalTokens { get; set; }
    public bool IsDisabled { get; set; }
}

public class MessageEntity
{
    public int Id { get; set; }
    public string SessionId { get; set; }
    public string Role { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ApiKeyEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Provider { get; set; }
    public string Alias { get; set; }
    public string KeyValue { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? TokenLimit { get; set; }
    public decimal? CostLimit { get; set; }
}
