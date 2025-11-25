-- KikiAI Database Initialization Script for MySQL
-- Run this script on your ASPone database: db4937

-- Create ChatSessions table
CREATE TABLE IF NOT EXISTS ChatSessions (
    Id VARCHAR(36) PRIMARY KEY,
    CreatedAt DATETIME NOT NULL,
    Title VARCHAR(500) NOT NULL,
    TotalTokens INT NOT NULL DEFAULT 0,
    IsDisabled TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_created (CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Messages table
CREATE TABLE IF NOT EXISTS Messages (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    SessionId VARCHAR(36) NOT NULL,
    Role VARCHAR(50) NOT NULL,
    Content LONGTEXT NOT NULL,
    CreatedAt DATETIME NOT NULL,
    INDEX idx_session (SessionId),
    FOREIGN KEY (SessionId) REFERENCES ChatSessions(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ApiKeys table
CREATE TABLE IF NOT EXISTS ApiKeys (
    Id VARCHAR(36) PRIMARY KEY,
    Provider VARCHAR(50) NOT NULL,
    Alias VARCHAR(200) NOT NULL,
    KeyValue VARCHAR(500) NOT NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL,
    TokenLimit INT NULL,
    CostLimit DECIMAL(10,2) NULL,
    INDEX idx_provider_active (Provider, IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
SHOW TABLES;
