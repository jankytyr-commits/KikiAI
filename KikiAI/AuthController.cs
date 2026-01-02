using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using BCrypt.Net;
using KikiAI; // Required to see KikiDbContext and UserEntity

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly KikiDbContext _context;

    public AuthController(KikiDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrEmpty(request.Login) || string.IsNullOrEmpty(request.Password))
            return BadRequest(new { message = "Chybí přihlašovací údaje." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Login == request.Login);
        
        if (user == null)
        {
            // Debug: list all users for troubleshooting
            var allLogins = await _context.Users.Select(u => u.Login).ToListAsync();
            return Unauthorized(new { message = "Nesprávné jméno nebo heslo.", debug = $"Existující loginy: {string.Join(", ", allLogins)}" });
        }

        bool validPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

        if (!validPassword)
            return Unauthorized(new { message = "Nesprávné jméno nebo heslo.", debug = "Heslo neodpovídá" });

        // For now, returning user info. JWT or Cookie auth can be added later.
        return Ok(new 
        { 
            success = true, 
            user = new 
            { 
                user.Id, 
                user.Login, 
                user.UserName, 
                user.UserType 
            } 
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrEmpty(request.Login) || string.IsNullOrEmpty(request.Password))
            return BadRequest(new { message = "Chybí údaje." });

        if (await _context.Users.AnyAsync(u => u.Login == request.Login))
            return BadRequest(new { message = "Uživatel s tímto loginem již existuje." });

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var newUser = new UserEntity
        {
            Login = request.Login,
            UserName = request.UserName ?? request.Login,
            PasswordHash = passwordHash,
            UserType = "user",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Registrace úspěšná." });
    }
    
    // Temporary utility to generate hash for Admin manual seeding if needed
    [HttpGet("generate-hash")]
    public IActionResult GenerateHash(string password)
    {
        if (string.IsNullOrEmpty(password)) return BadRequest();
        return Ok(BCrypt.Net.BCrypt.HashPassword(password));
    }

    // Reset password for a user (TEMPORARY - remove in production)
    [HttpGet("reset-password")]
    public async Task<IActionResult> ResetPasswordGet(string login, string newPassword)
    {
        if (string.IsNullOrEmpty(login) || string.IsNullOrEmpty(newPassword))
            return BadRequest(new { message = "Chybí údaje." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Login == login);
        if (user == null)
        {
            var allLogins = await _context.Users.Select(u => u.Login).ToListAsync();
            return NotFound(new { message = $"Uživatel '{login}' nenalezen.", existingLogins = allLogins });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Heslo pro '{login}' bylo resetováno." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.Login) || string.IsNullOrEmpty(request.NewPassword))
            return BadRequest(new { message = "Chybí údaje." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Login == request.Login);
        if (user == null)
            return NotFound(new { message = $"Uživatel '{request.Login}' nenalezen." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Heslo pro '{request.Login}' bylo resetováno." });
    }
}

public class ResetPasswordRequest
{
    public string Login { get; set; }
    public string NewPassword { get; set; }
}

public class LoginRequest
{
    public string Login { get; set; }
    public string Password { get; set; }
}

public class RegisterRequest
{
    public string Login { get; set; }
    public string UserName { get; set; }
    public string Password { get; set; }
}
