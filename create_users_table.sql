-- Ultra-simple script for AdminerEvo
-- If the table already exists, this command will fail (that is fine).
CREATE TABLE Users (
    Id INT IDENTITY(1, 1) PRIMARY KEY,
    Login NVARCHAR(100) NOT NULL UNIQUE,
    UserName NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(500) NOT NULL,
    UserType NVARCHAR(50) DEFAULT 'user',
    CreatedAt DATETIME DEFAULT GETDATE()
);
-- Insert admin user. 
-- If the user already exists (from a previous partial run), this will fail (also fine).
INSERT INTO Users (
        Login,
        UserName,
        PasswordHash,
        UserType,
        CreatedAt
    )
VALUES (
        'admin',
        'Administrator',
        '$2a$11$Z.s/GzP/Z.s/GzP/Z.s/Gu...',
        'admin',
        GETDATE()
    );