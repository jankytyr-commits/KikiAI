using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using KikiAI;

var builder = WebApplication.CreateBuilder(args);

// Load configuration (appsettings.json)
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

// Register HttpClient for external API calls
builder.Services.AddHttpClient();
builder.Services.AddSingleton<TavilyService>(sp => 
    new TavilyService(sp.GetRequiredService<IHttpClientFactory>(), builder.Configuration["Tavily:ApiKey"]));

builder.Services.AddSingleton<ChatService>();
builder.Services.AddSingleton<ApiKeyService>();


// Register AI provider based on configuration (read API keys from config)
// Register specific providers (removed as they are now created in factory)
// builder.Services.AddSingleton<GeminiProvider>(); 

// Register a factory to resolve provider by name
// Register a factory to resolve provider by name
builder.Services.AddSingleton<Func<string, IAIProvider>>(sp => key =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var httpFactory = sp.GetRequiredService<IHttpClientFactory>();
    var keyService = sp.GetRequiredService<ApiKeyService>();

    // Helper to get active key or fallback to config
    string GetKey(string provider, string configKey)
    {
        var activeKey = keyService.GetActiveKey(provider);
        if (activeKey != null && !string.IsNullOrEmpty(activeKey.Key))
            return activeKey.Key;
        return config[configKey] ?? "";
    }

    return key?.ToLower() switch
    {
        "openai" => new OpenAIProvider(httpFactory, GetKey("openai", "OpenAI:ApiKey"), "gpt-4o"),
        "openai-test" => new OpenAIProvider(httpFactory, GetKey("openai-test", "OpenAI:TestKey"), "gpt-4o-mini"),
        "gemini" => new GeminiProvider(httpFactory, GetKey("gemini", "Gemini:ApiKey"), "gemini-2.0-flash"),
        "gemini-2.5" => new GeminiProvider(httpFactory, GetKey("gemini-2.5", "Gemini:ApiKey"), "gemini-2.5-flash"),
        "gemini-1.5-pro" => new GeminiProvider(httpFactory, GetKey("gemini-1.5-pro", "Gemini:ApiKey"), "gemini-1.5-pro"),
        "gemini-1.5-flash" => new GeminiProvider(httpFactory, GetKey("gemini-1.5-flash", "Gemini:ApiKey"), "gemini-1.5-flash"),
        "claude" => new ClaudeProvider(httpFactory, GetKey("claude", "Claude:ApiKey"), "claude-3-haiku-20240307", sp.GetService<TavilyService>()),
        "claude-haiku" => new ClaudeProvider(httpFactory, GetKey("claude-haiku", "Claude:ApiKey"), "claude-3-5-haiku-20241022", sp.GetService<TavilyService>()),
        "mistral" => new MistralProvider(httpFactory, GetKey("mistral", "Mistral:ApiKey"), "mistral-small-latest", sp.GetService<TavilyService>()),
        "mistral-large" => new MistralProvider(httpFactory, GetKey("mistral-large", "Mistral:ApiKey"), "mistral-large-latest", sp.GetService<TavilyService>()),
        _ => new GeminiProvider(httpFactory, GetKey("gemini", "Gemini:ApiKey"), "gemini-2.0-flash") // Default
    };
});

// Add controllers for chat endpoint
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

var app = builder.Build();

// Serve static files (frontend) from wwwroot
app.UseDefaultFiles(); // serves index.html by default
app.UseStaticFiles();

app.MapControllers();

// Import existing keys from configuration
using (var scope = app.Services.CreateScope())
{
    var keyService = scope.ServiceProvider.GetRequiredService<ApiKeyService>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    void ImportKey(string provider, string configKey, string alias)
    {
        var key = config[configKey];
        if (!string.IsNullOrWhiteSpace(key))
        {
            // Check if key already exists to avoid duplicates
            var existingKeys = keyService.GetProviderKeys(provider);
            if (!existingKeys.Keys.Any(k => k.Key == key))
            {
                keyService.AddKey(provider, alias, key);
            }
        }
    }

    ImportKey("gemini", "Gemini:ApiKey", "Default Config Key");
    ImportKey("gemini-2.5", "Gemini:ApiKey", "Default Config Key");
    ImportKey("gemini-1.5-pro", "Gemini:ApiKey", "Default Config Key");
    ImportKey("gemini-1.5-flash", "Gemini:ApiKey", "Default Config Key");
    ImportKey("openai", "OpenAI:ApiKey", "Default Config Key");
    ImportKey("openai-test", "OpenAI:TestKey", "Default Config Key");
    ImportKey("claude", "Claude:ApiKey", "Default Config Key");
    ImportKey("claude-opus", "Claude:ApiKey", "Default Config Key");
    ImportKey("claude-haiku", "Claude:ApiKey", "Default Config Key");
    ImportKey("mistral", "Mistral:ApiKey", "Default Config Key");
    ImportKey("mistral-large", "Mistral:ApiKey", "Default Config Key");
}

app.Run();
