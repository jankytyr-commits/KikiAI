using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using KikiAI;

[ApiController]
[Route("api/diag")]
public class DiagController : ControllerBase
{
    private readonly KikiDbContext _context;

    public DiagController(KikiDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        string dbStatus = "Not Checked";
        try 
        {
            var canConnect = await _context.Database.CanConnectAsync();
            dbStatus = canConnect ? "Connected" : "Failed to Connect";
        }
        catch (Exception ex)
        {
            dbStatus = $"Error: {ex.Message}";
        }

        return Ok(new { 
            Status = "Healthy", 
            Database = dbStatus,
            Time = DateTime.Now.ToString(),
            Version = "1.0.2",
            Message = "Diagnostic endpoint reached"
        });
    }
}
