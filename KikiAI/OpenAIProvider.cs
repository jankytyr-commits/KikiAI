using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Linq;
using Microsoft.Extensions.Configuration;
using System.Text.Json.Nodes;

public class OpenAIProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;
    private const string Endpoint = "https://api.openai.com/v1/chat/completions";

    public OpenAIProvider(IHttpClientFactory httpClientFactory, string apiKey, string model = "gpt-4o")
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = apiKey ?? throw new ArgumentNullException(nameof(apiKey));
        _model = model;
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages)
    {
        return await GetResponseAsync(messages, null);
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages, ImageData? image)
    {
        var messagesList = messages.ToList();
        var openAIMessages = new List<object>();

        for (int i = 0; i < messagesList.Count; i++)
        {
            var msg = messagesList[i];
            var isLastUserMessage = (i == messagesList.Count - 1) && msg.Role == "user";

            if (isLastUserMessage && image != null)
            {
                // Last user message with image
                openAIMessages.Add(new
                {
                    role = msg.Role,
                    content = new object[]
                    {
                        new { type = "text", text = msg.Content },
                        new 
                        { 
                            type = "image_url",
                            image_url = new 
                            { 
                                url = $"data:{image.MimeType};base64,{image.Data}"
                            }
                        }
                    }
                });
            }
            else
            {
                // Regular message
                openAIMessages.Add(new { role = msg.Role, content = msg.Content });
            }
        }

        var request = new
        {
            model = _model,
            messages = openAIMessages.ToArray()
        };

        var response = await _httpClient.PostAsJsonAsync(Endpoint, request);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"OpenAI API Error: {response.StatusCode} - {errorContent}");
        }

        var node = await response.Content.ReadFromJsonAsync<JsonNode>();
        var content = node?["choices"]?[0]?["message"]?["content"]?.ToString();
        return content ?? string.Empty;
    }
}
