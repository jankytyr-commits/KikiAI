using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Linq;
using Microsoft.Extensions.Configuration;
using System.Text.Json.Nodes;

public class GeminiProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;

    public GeminiProvider(IHttpClientFactory httpClientFactory, string apiKey, string model = "gemini-2.0-flash")
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = apiKey ?? throw new ArgumentNullException(nameof(apiKey));
        _model = model;
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages)
    {
        return await GetResponseAsync(messages, null);
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages, ImageData? image)
    {
        var systemMessage = messages.FirstOrDefault(m => m.Role == "system");
        var chatMessages = messages.Where(m => m.Role != "system").ToList();

        // Build parts for the last user message (which may include an image)
        var contents = new List<object>();
        
        for (int i = 0; i < chatMessages.Count; i++)
        {
            var msg = chatMessages[i];
            var isLastUserMessage = (i == chatMessages.Count - 1) && msg.Role == "user";
            
            if (isLastUserMessage && image != null)
            {
                // Last user message with image
                contents.Add(new
                {
                    role = "user",
                    parts = new object[]
                    {
                        new { text = msg.Content },
                        new 
                        { 
                            inline_data = new 
                            { 
                                mime_type = image.MimeType,
                                data = image.Data 
                            } 
                        }
                    }
                });
            }
            else
            {
                // Regular message
                contents.Add(new
                {
                    role = msg.Role == "assistant" ? "model" : "user",
                    parts = new[] { new { text = msg.Content } }
                });
            }
        }

        var request = new
        {
            system_instruction = systemMessage != null ? new { parts = new[] { new { text = systemMessage.Content } } } : null,
            contents = contents.ToArray(),
            tools = new[]
            {
                new { google_search = new { } }
            }
        };

        try
        {
            return await MakeRequestAsync(_model, request);
        }
        catch (HttpRequestException ex) when (ex.Message.Contains("429") || ex.Message.Contains("ResourceExhausted") || ex.Message.Contains("TooManyRequests"))
        {
            // If we were using 2.0 and it failed, try 2.5 as fallback
            if (_model.Contains("gemini-2.0-flash"))
            {
                var fallbackText = await MakeRequestAsync("gemini-2.5-flash", request);
                return "[[FALLBACK_WARNING]]" + fallbackText;
            }
            throw;
        }
    }

    private async Task<string> MakeRequestAsync(string model, object requestPayload)
    {
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
        var response = await _httpClient.PostAsJsonAsync($"{endpoint}?key={_apiKey}", requestPayload);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            
            // Try to list available models for debugging
            string availableModels = "Could not retrieve models.";
            try
            {
                var listModelsResponse = await _httpClient.GetAsync($"https://generativelanguage.googleapis.com/v1beta/models?key={_apiKey}");
                if (listModelsResponse.IsSuccessStatusCode)
                {
                    var listJson = await listModelsResponse.Content.ReadFromJsonAsync<JsonNode>();
                    var models = listJson?["models"]?.AsArray().Select(n => n?["name"]?.ToString()).Where(n => n != null);
                    if (models != null)
                    {
                        availableModels = string.Join(", ", models);
                    }
                }
            }
            catch { /* Ignore list models error */ }

            throw new HttpRequestException($"Gemini API Error: {response.StatusCode}. Available models: {availableModels}. Details: {errorContent}");
        }

        var node = await response.Content.ReadFromJsonAsync<JsonNode>();
        var text = node?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();
        return text ?? string.Empty;
    }
}
