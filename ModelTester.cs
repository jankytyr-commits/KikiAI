using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

class ModelTester
{
    static async Task Main(string[] args)
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        var httpClient = new HttpClient();
        
        Console.WriteLine("=== Testing AI Model Availability ===\n");

        // Test OpenAI models
        await TestOpenAI(httpClient, config["OpenAI:ApiKey"]);
        
        // Test Claude models
        await TestClaude(httpClient, config["Claude:ApiKey"]);
        
        // Test Gemini models
        await TestGemini(httpClient, config["Gemini:ApiKey"]);
    }

    static async Task TestOpenAI(HttpClient client, string apiKey)
    {
        Console.WriteLine("--- OpenAI Models ---");
        if (string.IsNullOrEmpty(apiKey))
        {
            Console.WriteLine("❌ No API key configured\n");
            return;
        }

        var models = new[] { "gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini" };
        
        foreach (var model in models)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
                request.Headers.Add("Authorization", $"Bearer {apiKey}");
                request.Content = JsonContent.Create(new
                {
                    model = model,
                    messages = new[] { new { role = "user", content = "Hi" } },
                    max_tokens = 5
                });

                var response = await client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"✅ {model}");
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"❌ {model} - {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ {model} - {ex.Message}");
            }
        }
        Console.WriteLine();
    }

    static async Task TestClaude(HttpClient client, string apiKey)
    {
        Console.WriteLine("--- Claude Models ---");
        if (string.IsNullOrEmpty(apiKey))
        {
            Console.WriteLine("❌ No API key configured\n");
            return;
        }

        var models = new[] { "claude-3-opus-20240229", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022" };
        
        foreach (var model in models)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
                request.Headers.Add("x-api-key", apiKey);
                request.Headers.Add("anthropic-version", "2023-06-01");
                request.Content = JsonContent.Create(new
                {
                    model = model,
                    messages = new[] { new { role = "user", content = "Hi" } },
                    max_tokens = 5
                });

                var response = await client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"✅ {model}");
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"❌ {model} - {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ {model} - {ex.Message}");
            }
        }
        Console.WriteLine();
    }

    static async Task TestGemini(HttpClient client, string apiKey)
    {
        Console.WriteLine("--- Gemini Models ---");
        if (string.IsNullOrEmpty(apiKey))
        {
            Console.WriteLine("❌ No API key configured\n");
            return;
        }

        var models = new[] { "gemini-2.0-flash-exp", "gemini-exp-1206", "gemini-2.0-flash-thinking-exp" };
        
        foreach (var model in models)
        {
            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var request = new HttpRequestMessage(HttpMethod.Post, url);
                request.Content = JsonContent.Create(new
                {
                    contents = new[] { new { parts = new[] { new { text = "Hi" } } } }
                });

                var response = await client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"✅ {model}");
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"❌ {model} - {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ {model} - {ex.Message}");
            }
        }
        Console.WriteLine();
    }
}
