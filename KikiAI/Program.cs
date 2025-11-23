using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Load configuration (appsettings.json)
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

// Register HttpClient for external API calls
builder.Services.AddHttpClient();
builder.Services.AddSingleton<TavilyService>(sp => 
    new TavilyService(sp.GetRequiredService<IHttpClientFactory>(), builder.Configuration["Tavily:ApiKey"]));

builder.Services.AddSingleton<ChatService>();


// Register AI provider based on configuration (read API keys from config)
// Register specific providers (removed as they are now created in factory)
// builder.Services.AddSingleton<GeminiProvider>(); 

// Register a factory to resolve provider by name
builder.Services.AddSingleton<Func<string, IAIProvider>>(sp => key =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var httpFactory = sp.GetRequiredService<IHttpClientFactory>();

    return key?.ToLower() switch
    {
        "openai" => new OpenAIProvider(httpFactory, config["OpenAI:ApiKey"], "gpt-4o"),
        "openai-test" => new OpenAIProvider(httpFactory, config["OpenAI:TestKey"], "gpt-4o-mini"),
        "gemini" => new GeminiProvider(httpFactory, config["Gemini:ApiKey"], "gemini-2.0-flash"),
        "gemini-2.5" => new GeminiProvider(httpFactory, config["Gemini:ApiKey"], "gemini-2.5-flash"),
        "claude" => new ClaudeProvider(httpFactory, config["Claude:ApiKey"], "claude-3-5-sonnet", sp.GetService<TavilyService>()),
        "claude-haiku" => new ClaudeProvider(httpFactory, config["Claude:ApiKey"], "claude-3-5-haiku-20241022", sp.GetService<TavilyService>()),
        "mistral" => new MistralProvider(httpFactory, config["Mistral:ApiKey"], "mistral-small-latest", sp.GetService<TavilyService>()),
        "mistral-large" => new MistralProvider(httpFactory, config["Mistral:ApiKey"], "mistral-large-latest", sp.GetService<TavilyService>()),
        _ => new GeminiProvider(httpFactory, config["Gemini:ApiKey"], "gemini-2.0-flash") // Default
    };
});

// Add controllers for chat endpoint
builder.Services.AddControllers();

var app = builder.Build();

// Serve static files (frontend) from wwwroot
app.UseDefaultFiles(); // serves index.html by default
app.UseStaticFiles();

app.MapControllers();

app.Run();
