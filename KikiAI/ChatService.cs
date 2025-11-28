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
    public string Title { get; set; } = "Nový chat";
    public List<Message> Messages { get; set; } = new();
    public int TotalTokens { get; set; }
    public Dictionary<string, bool> DisabledProviders { get; set; } = new();
    public List<AttachedFile> AttachedFiles { get; set; } = new();
}

public class AttachedFile
{
    public string FileName { get; set; }
    public string FilePath { get; set; }
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
    public string MimeType { get; set; }
}

public class ChatSessionSummary
{
    public string Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Title { get; set; }
    public string FirstMessagePreview { get; set; }
    public int MessageCount { get; set; }
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

    private string GetChatDirectory(DateTime date)
    {
        var yearMonth = date.ToString("yyyy-MM");
        var dir = Path.Combine(_chatsDir, yearMonth);
        if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
        return dir;
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
        // Try root directory first (backward compatibility)
        var path = Path.Combine(_chatsDir, $"chat_{id}.json");
        if (File.Exists(path))
        {
            var json = await File.ReadAllTextAsync(path);
            return JsonSerializer.Deserialize<ChatSession>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }

        // Search in date-based subdirectories
        var subdirs = Directory.GetDirectories(_chatsDir, "????-??");
        foreach (var subdir in subdirs)
        {
            path = Path.Combine(subdir, $"chat_{id}.json");
            if (File.Exists(path))
            {
                var json = await File.ReadAllTextAsync(path);
                return JsonSerializer.Deserialize<ChatSession>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
        }

        return null;
    }

    public async Task SaveSessionAsync(ChatSession session)
    {
        // Use date-based directory
        var dir = GetChatDirectory(session.CreatedAt);
        var path = Path.Combine(dir, $"chat_{session.Id}.json");
        var json = JsonSerializer.Serialize(session, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(path, json);
        // Ensure it's marked as current
        await File.WriteAllTextAsync(_currentSessionFile, session.Id);
    }

    public async Task<bool> DisableSessionAsync(string id)
    {
        var path = Path.Combine(_chatsDir, $"chat_{id}.json");
        if (!File.Exists(path)) return false;
        
        var disabledDir = Path.Combine(_chatsDir, "Disabled_Chats");
        if (!Directory.Exists(disabledDir)) Directory.CreateDirectory(disabledDir);

        var disabledPath = Path.Combine(disabledDir, $"chat_{id}_disabled.json");
        File.Move(path, disabledPath);
        
        // If this was the current session, clear it
        if (File.Exists(_currentSessionFile))
        {
            var currentId = await File.ReadAllTextAsync(_currentSessionFile);
            if (currentId == id)
            {
                File.Delete(_currentSessionFile);
            }
        }
        
        return true;
    }

    public async Task<List<ChatSessionSummary>> GetAllSessionsAsync()
    {
        var summaries = new List<ChatSessionSummary>();
        var allChatFiles = new List<string>();

        // Get chats from root directory (backward compatibility)
        allChatFiles.AddRange(Directory.GetFiles(_chatsDir, "chat_*.json")
            .Where(f => !f.EndsWith("_disabled.json")));

        // Get chats from date-based subdirectories
        var subdirs = Directory.GetDirectories(_chatsDir, "????-??");
        foreach (var subdir in subdirs)
        {
            allChatFiles.AddRange(Directory.GetFiles(subdir, "chat_*.json")
                .Where(f => !f.EndsWith("_disabled.json")));
        }

        foreach (var file in allChatFiles)
        {
            try
            {
                var json = await File.ReadAllTextAsync(file);
                var session = JsonSerializer.Deserialize<ChatSession>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (session != null)
                {
                    summaries.Add(new ChatSessionSummary
                    {
                        Id = session.Id,
                        CreatedAt = session.CreatedAt,
                        Title = session.Title ?? "Nový chat",
                        FirstMessagePreview = session.Messages.FirstOrDefault()?.Content ?? "No messages",
                        MessageCount = session.Messages.Count
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading session from {file}: {ex.Message}");
                File.AppendAllText("error_log.txt", $"Error loading session from {file}: {ex.Message}\n{ex.StackTrace}\n");
            }
        }

        return summaries.OrderByDescending(s => s.CreatedAt).ToList();
    }

    public string GetSessionFilesDirectory(string sessionId)
    {
        var sessionDir = Path.Combine(_chatsDir, sessionId);
        var filesDir = Path.Combine(sessionDir, "files");
        Directory.CreateDirectory(filesDir);
        return filesDir;
    }

    public async Task<AttachedFile> SaveFileToSessionAsync(string sessionId, string fileName, byte[] fileData, string mimeType)
    {
        var filesDir = GetSessionFilesDirectory(sessionId);
        var filePath = Path.Combine(filesDir, fileName);
        
        // Handle duplicate filenames
        var counter = 1;
        var originalFileName = fileName;
        var extension = Path.GetExtension(fileName);
        var nameWithoutExt = Path.GetFileNameWithoutExtension(fileName);
        
        while (File.Exists(filePath))
        {
            fileName = $"{nameWithoutExt}_{counter}{extension}";
            filePath = Path.Combine(filesDir, fileName);
            counter++;
        }
        
        await File.WriteAllBytesAsync(filePath, fileData);
        
        return new AttachedFile
        {
            FileName = fileName,
            FilePath = Path.Combine("files", fileName), // Relative path
            FileSize = fileData.Length,
            UploadedAt = DateTime.Now,
            MimeType = mimeType
        };
    }

    public string GetAbsoluteFilePath(string sessionId, string relativePath)
    {
        return Path.Combine(_chatsDir, sessionId, relativePath);
    }
}
