using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace KikiAI;

public class ApiKeyUsage
{
    public int? Tokens { get; set; }
    public decimal? Cost { get; set; }
    public int? TokenLimit { get; set; }
    public decimal? CostLimit { get; set; }
}

public class ApiKey
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Alias { get; set; } = "Unnamed Key";
    public string Key { get; set; } = string.Empty;
    public ApiKeyUsage Usage { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

public class ProviderKeys
{
    public string ActiveKeyId { get; set; } = string.Empty;
    public List<ApiKey> Keys { get; set; } = new();
}

public class ApiKeysData
{
    public Dictionary<string, ProviderKeys> Providers { get; set; } = new();
}

public class ApiKeyService
{
    private readonly string _keysFile;
    private ApiKeysData _data;

    public ApiKeyService()
    {
        var keysDir = Path.Combine(Directory.GetCurrentDirectory(), "Config");
        if (!Directory.Exists(keysDir)) Directory.CreateDirectory(keysDir);
        _keysFile = Path.Combine(keysDir, "api-keys.json");
        LoadKeys();
    }

    private void LoadKeys()
    {
        if (File.Exists(_keysFile))
        {
            var json = File.ReadAllText(_keysFile);
            _data = JsonSerializer.Deserialize<ApiKeysData>(json) ?? new ApiKeysData();
        }
        else
        {
            _data = new ApiKeysData();
            SaveKeys();
        }
    }

    private void SaveKeys()
    {
        var json = JsonSerializer.Serialize(_data, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(_keysFile, json);
    }

    public ProviderKeys GetProviderKeys(string provider)
    {
        if (!_data.Providers.ContainsKey(provider))
        {
            _data.Providers[provider] = new ProviderKeys();
        }
        return _data.Providers[provider];
    }

    public ApiKey? GetActiveKey(string provider)
    {
        var providerKeys = GetProviderKeys(provider);
        if (string.IsNullOrEmpty(providerKeys.ActiveKeyId))
            return providerKeys.Keys.FirstOrDefault();
        
        return providerKeys.Keys.FirstOrDefault(k => k.Id == providerKeys.ActiveKeyId);
    }

    public void AddKey(string provider, string alias, string key, ApiKeyUsage? usage = null)
    {
        var providerKeys = GetProviderKeys(provider);
        var newKey = new ApiKey
        {
            Alias = alias,
            Key = key,
            Usage = usage ?? new ApiKeyUsage()
        };
        
        providerKeys.Keys.Add(newKey);
        
        // If this is the first key, make it active
        if (providerKeys.Keys.Count == 1)
        {
            providerKeys.ActiveKeyId = newKey.Id;
        }
        
        SaveKeys();
    }

    public bool RemoveKey(string provider, string keyId)
    {
        var providerKeys = GetProviderKeys(provider);
        var key = providerKeys.Keys.FirstOrDefault(k => k.Id == keyId);
        if (key == null) return false;
        
        providerKeys.Keys.Remove(key);
        
        // If we removed the active key, set a new one
        if (providerKeys.ActiveKeyId == keyId)
        {
            providerKeys.ActiveKeyId = providerKeys.Keys.FirstOrDefault()?.Id ?? string.Empty;
        }
        
        SaveKeys();
        return true;
    }

    public bool SetActiveKey(string provider, string keyId)
    {
        var providerKeys = GetProviderKeys(provider);
        var key = providerKeys.Keys.FirstOrDefault(k => k.Id == keyId);
        if (key == null) return false;
        
        providerKeys.ActiveKeyId = keyId;
        SaveKeys();
        return true;
    }

    public void UpdateUsage(string provider, string keyId, ApiKeyUsage usage)
    {
        var providerKeys = GetProviderKeys(provider);
        var key = providerKeys.Keys.FirstOrDefault(k => k.Id == keyId);
        if (key != null)
        {
            key.Usage = usage;
            SaveKeys();
        }
    }

    public bool ValidateKey(string provider, string key)
    {
        // Basic validation based on provider
        return provider.ToLower() switch
        {
            "gemini" or "gemini-2.5" => key.StartsWith("AIza") && key.Length > 30,
            "openai" or "openai-test" => key.StartsWith("sk-") && key.Length > 40,
            "claude" or "claude-haiku" => key.StartsWith("sk-ant-") && key.Length > 50,
            "mistral" or "mistral-large" => key.Length > 30,
            _ => key.Length > 10
        };
    }
}
