using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

public class ChatSession
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public List<Message> Messages { get; set; } = new();
    public int TotalTokens { get; set; }
    public Dictionary<string, bool> DisabledProviders { get; set; } = new();
}

public class ChatService
{
    private readonly string _chatsDir;
    private readonly string _currentSessionFile;

    public ChatService()
    {
        _chatsDir = Path.Combine(Directory.GetCurrentDirectory(), "Chats");
        _currentSessionFile = Path.Combine(_chatsDir, "current_session.txt");
        if (!Directory.Exists(_chatsDir)) Directory.CreateDirectory(_chatsDir);
    }

    public async Task<ChatSession> GetCurrentSessionAsync()
    {
        if (File.Exists(_currentSessionFile))
        {
            var id = await File.ReadAllTextAsync(_currentSessionFile);
            var session = await LoadSessionAsync(id);
            if (session != null) return session;
        }
        return await CreateNewSessionAsync();
    }

    public async Task<ChatSession> CreateNewSessionAsync()
    {
        var session = new ChatSession();
        await SaveSessionAsync(session);
        await File.WriteAllTextAsync(_currentSessionFile, session.Id);
        return session;
    }

    public async Task<ChatSession?> LoadSessionAsync(string id)
    {
        var path = Path.Combine(_chatsDir, $"chat_{id}.json");
        if (!File.Exists(path)) return null;
        var json = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<ChatSession>(json);
    }

    public async Task SaveSessionAsync(ChatSession session)
    {
        var path = Path.Combine(_chatsDir, $"chat_{session.Id}.json");
        var json = JsonSerializer.Serialize(session, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(path, json);
        // Ensure it's marked as current
        await File.WriteAllTextAsync(_currentSessionFile, session.Id);
    }
}
