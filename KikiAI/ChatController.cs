using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly Func<string, IAIProvider> _providerFactory;
    private readonly ChatService _chatService;
    private readonly TavilyService _tavilyService;

    public ChatController(Func<string, IAIProvider> providerFactory, ChatService chatService, TavilyService tavilyService)
    {
        _providerFactory = providerFactory;
        _chatService = chatService;
        _tavilyService = tavilyService;
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var session = await _chatService.GetCurrentSessionAsync();
        return Ok(session);
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetAllSessions()
    {
        var summaries = await _chatService.GetAllSessionsAsync();
        return Ok(summaries);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new List<SearchResult>());

        var results = await _chatService.SearchChatsAsync(q);
        return Ok(results);
    }

    [HttpGet("session/{id}")]
    public async Task<IActionResult> GetSession(string id)
    {
        var session = await _chatService.LoadSessionAsync(id);
        if (session == null)
            return NotFound();
        return Ok(session);
    }

    [HttpPost("new")]
    public async Task<IActionResult> NewChat()
    {
        var session = await _chatService.CreateNewSessionAsync();
        return Ok(session);
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportChat([FromBody] ChatSession session)
    {
        // Generate new ID to avoid conflicts
        session.Id = Guid.NewGuid().ToString();
        session.CreatedAt = DateTime.Now;
        
        // Ensure title is set
        if (string.IsNullOrEmpty(session.Title))
        {
            session.Title = "Importovaný chat";
        }

        await _chatService.SaveSessionAsync(session);
        return Ok(new { success = true, id = session.Id });
    }

    [HttpPut("session/{id}/messages")]
    public async Task<IActionResult> UpdateSessionMessages(string id, [FromBody] List<Message> messages)
    {
        var session = await _chatService.LoadSessionAsync(id);
        if (session == null) return NotFound();

        session.Messages = messages;
        await _chatService.SaveSessionAsync(session);
        return Ok(new { success = true });
    }

    [HttpDelete("session/{id}")]
    public async Task<IActionResult> DeleteSession(string id)
    {
        var result = await _chatService.DisableSessionAsync(id);
        if (result)
            return Ok(new { success = true, message = "Chat byl deaktivován." });
        return NotFound(new { success = false, message = "Chat nebyl nalezen." });
    }

    [HttpPost("session/{sessionId}/upload")]
    public async Task<IActionResult> UploadFile(string sessionId, [FromBody] FileUploadRequest request)
    {
        try
        {
            // Decode base64 file data
            var fileData = Convert.FromBase64String(request.FileData);
            
            // Save file to session directory
            var attachedFile = await _chatService.SaveFileToSessionAsync(
                sessionId, 
                request.FileName, 
                fileData, 
                request.MimeType
            );
            
            // Load session and add file reference
            var session = await _chatService.LoadSessionAsync(sessionId);
            if (session != null)
            {
                session.AttachedFiles.Add(attachedFile);
                await _chatService.SaveSessionAsync(session);
            }
            
            return Ok(new { success = true, file = attachedFile });
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("session/{sessionId}/file/{fileName}")]
    public IActionResult DownloadFile(string sessionId, string fileName)
    {
        try
        {
            var filePath = _chatService.GetAbsoluteFilePath(sessionId, Path.Combine("files", fileName));
            
            if (!System.IO.File.Exists(filePath))
                return NotFound();
            
            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            var mimeType = GetMimeType(fileName);
            
            return File(fileBytes, mimeType, fileName);
        }
        catch (Exception ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    private string GetMimeType(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".pdf" => "application/pdf",
            ".txt" => "text/plain",
            ".cs" => "text/plain",
            ".js" => "text/javascript",
            ".json" => "application/json",
            ".xml" => "application/xml",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        try
        {
            var messagesToProcess = request.Messages.ToList();

            // Web Search Logic
            if (request.UseSearch)
            {
                var lastUserMsg = messagesToProcess.LastOrDefault(m => m.Role == "user");
                if (lastUserMsg != null)
                {
                    try 
                    {
                        var searchResult = await _tavilyService.SearchAsync(lastUserMsg.Content);
                        
                        // Add search results as a system message or context
                        // We'll insert it before the last user message
                        // Append search results to the user message (create a copy to avoid modifying history)
                        var lastUserMsgIndex = messagesToProcess.LastIndexOf(lastUserMsg);
                        if (lastUserMsgIndex != -1)
                        {
                            var newContent = lastUserMsg.Content + $"\n\n[Web Search Results]:\n{searchResult}\n\nUse these results to answer the user's question if relevant.";
                            messagesToProcess[lastUserMsgIndex] = new Message("user", newContent);
                        }
                    }
                    catch (Exception ex)
                    {
                        // Log error but continue
                        Console.WriteLine($"Search failed: {ex.Message}");
                    }
                }
            }

            var provider = _providerFactory(request.Provider);
            var response = await provider.GetResponseAsync(messagesToProcess, request.Image);

            // Save history
            var session = !string.IsNullOrEmpty(request.SessionId) 
                ? await _chatService.LoadSessionAsync(request.SessionId) 
                : await _chatService.GetCurrentSessionAsync();

            if (session == null) session = await _chatService.CreateNewSessionAsync();

            // Update session messages (we save the original user message, not the one with search context)
            var sessionMessages = request.Messages.ToList();
            sessionMessages.Add(new Message("assistant", response));
            
            session.Messages = sessionMessages;
            
            // Set title from first user message if not set
            if (session.Title == "Nový chat" || string.IsNullOrEmpty(session.Title))
            {
                var firstUserMessage = session.Messages.FirstOrDefault(m => m.Role == "user");
                if (firstUserMessage != null)
                {
                    session.Title = firstUserMessage.Content.Length > 50 
                        ? firstUserMessage.Content.Substring(0, 50) + "..." 
                        : firstUserMessage.Content;
                }
            }
            
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
    public bool UseSearch { get; set; }
    public ImageData? Image { get; set; }
}

public class ImageData
{
    public string Data { get; set; } // Base64 encoded image
    public string MimeType { get; set; }
}

public class FileUploadRequest
{
    public string FileName { get; set; }
    public string FileData { get; set; } // Base64 encoded
    public string MimeType { get; set; }
}
