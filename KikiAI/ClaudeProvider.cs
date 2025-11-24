using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Linq;
using System.Text.Json.Nodes;

public class ClaudeProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly TavilyService _tavilyService;
    private const string Endpoint = "https://api.anthropic.com/v1/messages";

    public ClaudeProvider(IHttpClientFactory httpClientFactory, string apiKey, string model, TavilyService tavilyService = null)
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = apiKey ?? throw new ArgumentNullException(nameof(apiKey));
        _model = model;
        _tavilyService = tavilyService;
        
        _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages)
    {
        return await GetResponseAsync(messages, null);
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages, ImageData? image)
    {
        if (!ClaudeUsageTracker.IsWithinLimit())
            throw new HttpRequestException("Claude API: Monthly limit reached ($4.50 safety threshold).");

        var tools = _tavilyService != null ? new object[] {
            new {
                name = "web_search",
                description = "Search the web for current information, news, or answers to questions that require up-to-date data.",
                input_schema = new {
                    type = "object",
                    properties = new {
                        query = new { type = "string", description = "The search query" }
                    },
                    required = new[] { "query" }
                }
            }
        } : null;

        var messagesList = messages.ToList();
        var claudeMessages = new List<object>();

        for (int i = 0; i < messagesList.Count; i++)
        {
            var msg = messagesList[i];
            var isLastUserMessage = (i == messagesList.Count - 1) && msg.Role == "user";

            if (isLastUserMessage && image != null)
            {
                // Last user message with image
                claudeMessages.Add(new
                {
                    role = msg.Role,
                    content = new object[]
                    {
                        new 
                        { 
                            type = "image",
                            source = new 
                            { 
                                type = "base64",
                                media_type = image.MimeType,
                                data = image.Data
                            }
                        },
                        new { type = "text", text = msg.Content }
                    }
                });
            }
            else
            {
                // Regular message
                claudeMessages.Add(new { role = msg.Role, content = msg.Content });
            }
        }

        var request = new {
            model = _model,
            max_tokens = 4096,
            messages = claudeMessages.ToArray(),
            tools = tools
        };

        var response = await _httpClient.PostAsJsonAsync(Endpoint, request);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Claude API Error: {response.StatusCode} - {errorContent}");
        }

        var node = await response.Content.ReadFromJsonAsync<JsonNode>();
        
        // Check if Claude wants to use a tool
        var stopReason = node?["stop_reason"]?.ToString();
        if (stopReason == "tool_use" && _tavilyService != null)
        {
            var toolUseBlock = node?["content"]?.AsArray()?.FirstOrDefault(c => c?["type"]?.ToString() == "tool_use");
            if (toolUseBlock != null)
            {
                var toolName = toolUseBlock["name"]?.ToString();
                var toolId = toolUseBlock["id"]?.ToString();
                var query = toolUseBlock["input"]?["query"]?.ToString();

                if (toolName == "web_search" && !string.IsNullOrEmpty(query))
                {
                    // Execute search
                    var searchResults = await _tavilyService.SearchAsync(query);
                    
                    // Send results back to Claude
                    var followUpMessages = messages.ToList();
                    var assistantContent = node["content"]?.ToJsonString() ?? "";
                    var escapedResults = searchResults.Replace("\"", "\\\"").Replace("\n", "\\n");
                    
                    followUpMessages.Add(new Message("assistant", assistantContent));
                    followUpMessages.Add(new Message("user", 
                        $"{{\"type\":\"tool_result\",\"tool_use_id\":\"{toolId}\",\"content\":\"{escapedResults}\"}}"));

                    var followUpRequest = new {
                        model = _model,
                        max_tokens = 4096,
                        messages = followUpMessages.Select(m => new { role = m.Role, content = m.Content }).ToArray(),
                        tools = tools
                    };

                    var followUpResponse = await _httpClient.PostAsJsonAsync(Endpoint, followUpRequest);
                    if (followUpResponse.IsSuccessStatusCode)
                    {
                        var followUpNode = await followUpResponse.Content.ReadFromJsonAsync<JsonNode>();
                        var finalContent = followUpNode?["content"]?[0]?["text"]?.ToString();
                        
                        TrackUsage(followUpNode);
                        return finalContent ?? searchResults;
                    }
                }
            }
        }

        var content = node?["content"]?[0]?["text"]?. ToString();
        TrackUsage(node);
        return content ?? string.Empty;
    }

    private void TrackUsage(JsonNode node)
    {
        var inputTokens = node?["usage"]?["input_tokens"]?.GetValue<int>() ?? 0;
        var outputTokens = node?["usage"]?["output_tokens"]?.GetValue<int>() ?? 0;
        bool isHaiku = _model.Contains("haiku");
        ClaudeUsageTracker.AddUsage(inputTokens, outputTokens, isHaiku);
    }
}
