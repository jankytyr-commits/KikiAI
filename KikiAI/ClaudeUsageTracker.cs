using System;
using System.IO;
using System.Text.Json;

public class ClaudeUsageTracker
{
    private const string UsageFilePath = "claude_usage.json";
    private const decimal MonthlyLimit = 5.00m;
    private const decimal SafetyThreshold = 4.50m;
    
    // Claude 3.5 Sonnet pricing (per 1M tokens)
    private const decimal SonnetInputCost = 3.00m;
    private const decimal SonnetOutputCost = 15.00m;
    
    // Claude 3.5 Haiku pricing (per 1M tokens)
    private const decimal HaikuInputCost = 0.80m;
    private const decimal HaikuOutputCost = 4.00m;
    
    public class UsageData
    {
        public decimal TotalCost { get; set; }
        public int TotalInputTokens { get; set; }
        public int TotalOutputTokens { get; set; }
        public DateTime LastReset { get; set; }
        public DateTime LastUpdated { get; set; }
    }
    
    public static UsageData LoadUsage()
    {
        if (File.Exists(UsageFilePath))
        {
            try
            {
                var json = File.ReadAllText(UsageFilePath);
                var data = JsonSerializer.Deserialize<UsageData>(json);
                
                // Auto-reset if new month
                if (data != null && data.LastReset.Month != DateTime.Now.Month)
                {
                    data = new UsageData { LastReset = DateTime.Now, LastUpdated = DateTime.Now };
                    SaveUsage(data);
                }
                
                return data ?? new UsageData { LastReset = DateTime.Now, LastUpdated = DateTime.Now };
            }
            catch
            {
                return new UsageData { LastReset = DateTime.Now, LastUpdated = DateTime.Now };
            }
        }
        
        return new UsageData { LastReset = DateTime.Now, LastUpdated = DateTime.Now };
    }
    
    public static void SaveUsage(UsageData data)
    {
        data.LastUpdated = DateTime.Now;
        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(UsageFilePath, json);
    }
    
    public static decimal CalculateCost(int inputTokens, int outputTokens, bool isHaiku = false)
    {
        var inputCost = isHaiku ? HaikuInputCost : SonnetInputCost;
        var outputCost = isHaiku ? HaikuOutputCost : SonnetOutputCost;
        
        return (inputTokens / 1_000_000m * inputCost) + (outputTokens / 1_000_000m * outputCost);
    }
    
    public static bool IsWithinLimit()
    {
        var usage = LoadUsage();
        return usage.TotalCost < SafetyThreshold;
    }
    
    public static void AddUsage(int inputTokens, int outputTokens, bool isHaiku = false)
    {
        var usage = LoadUsage();
        var cost = CalculateCost(inputTokens, outputTokens, isHaiku);
        
        usage.TotalInputTokens += inputTokens;
        usage.TotalOutputTokens += outputTokens;
        usage.TotalCost += cost;
        
        SaveUsage(usage);
    }
    
    public static UsageData GetCurrentUsage()
    {
        return LoadUsage();
    }
    
    public static void ResetUsage()
    {
        var data = new UsageData { LastReset = DateTime.Now, LastUpdated = DateTime.Now };
        SaveUsage(data);
    }
}
