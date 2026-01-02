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
            return Unauthorized(new { message = "Nesprávné jméno nebo heslo." });

        bool validPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

        if (!validPassword)
            return Unauthorized(new { message = "Nesprávné jméno nebo heslo." });

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
