using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly Func<string, IAIProvider> _providerFactory;
    private readonly ChatService _chatService;

    public ChatController(Func<string, IAIProvider> providerFactory, ChatService chatService)
    {
        _providerFactory = providerFactory;
        _chatService = chatService;
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var session = await _chatService.GetCurrentSessionAsync();
        return Ok(session);
    }

    [HttpPost("new")]
    public async Task<IActionResult> NewChat()
    {
        var session = await _chatService.CreateNewSessionAsync();
        return Ok(session);
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        try
        {
            var provider = _providerFactory(request.Provider);
            var response = await provider.GetResponseAsync(request.Messages);

            // Save history
            var session = !string.IsNullOrEmpty(request.SessionId) 
                ? await _chatService.LoadSessionAsync(request.SessionId) 
                : await _chatService.GetCurrentSessionAsync();

            if (session == null) session = await _chatService.CreateNewSessionAsync();

            // Update session messages
            // We assume request.Messages contains the full history sent by client, 
            // OR we append. The client usually sends full history. 
            // Let's trust the client's view for now, but append the new response.
            // Actually, to be safe and consistent, let's take the client's messages 
            // (which includes the new user message) and append the bot response.
            var updatedMessages = request.Messages.ToList();
            updatedMessages.Add(new Message("assistant", response));
            
            session.Messages = updatedMessages;
            // We could update tokens here if we tracked them per message, 
            // but for now we just save the messages.
            
            await _chatService.SaveSessionAsync(session);

            return Ok(new { success = true, response, sessionId = session.Id });
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, error = ex.Message, type = "Error" });
        }
    }
    
    [HttpGet("claude-usage")]
    public IActionResult GetClaudeUsage()
    {
        var usage = ClaudeUsageTracker.GetCurrentUsage();
        return Ok(new
        {
            totalCost = usage.TotalCost,
            totalInputTokens = usage.TotalInputTokens,
            totalOutputTokens = usage.TotalOutputTokens,
            limit = 5.00m,
            safetyThreshold = 4.50m,
            isWithinLimit = ClaudeUsageTracker.IsWithinLimit(),
            lastReset = usage.LastReset,
            lastUpdated = usage.LastUpdated
        });
    }
    
    [HttpPost("reset-claude-usage")]
    public IActionResult ResetClaudeUsage()
    {
        ClaudeUsageTracker.ResetUsage();
        return Ok(new { success = true, message = "Claude usage has been reset." });
    }
}

public class ChatRequest
{
    public IEnumerable<Message> Messages { get; set; }
    public string Provider { get; set; }
    public string SessionId { get; set; }
}
