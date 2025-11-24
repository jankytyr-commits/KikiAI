using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Linq;
using System.Text.Json.Nodes;

public class MistralProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;
    private const string Endpoint = "https://api.mistral.ai/v1/chat/completions";
    private readonly TavilyService _tavilyService;

    public MistralProvider(IHttpClientFactory httpClientFactory, string apiKey, string model, TavilyService tavilyService = null)
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = apiKey ?? throw new ArgumentNullException(nameof(apiKey));
        _model = model;
        _tavilyService = tavilyService;
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages)
    {
        var requestPayload = new Dictionary<string, object>
        {
            { "model", _model },
            { "messages", messages.Select(m => new { role = m.Role, content = m.Content }).ToArray() }
        };

        if (_tavilyService != null)
        {
            requestPayload["tools"] = new[]
            {
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "web_search",
                        description = "Search the web for current information, news, or facts.",
                        parameters = new
                        {
                            type = "object",
                            properties = new
                            {
                                query = new { type = "string", description = "The search query" }
                            },
                            required = new[] { "query" }
                        }
                    }
                }
            };
            requestPayload["tool_choice"] = "auto";
        }

        var response = await _httpClient.PostAsJsonAsync(Endpoint, requestPayload);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Mistral API Error: {response.StatusCode} - {errorContent}");
        }

        var node = await response.Content.ReadFromJsonAsync<JsonNode>();
        var choice = node?["choices"]?[0];
        var finishReason = choice?["finish_reason"]?.ToString();
        var message = choice?["message"];

        // Check for tool calls
        if (finishReason == "tool_calls" || message?["tool_calls"] != null)
        {
            var toolCalls = message?["tool_calls"]?.AsArray();
            if (toolCalls != null && toolCalls.Count > 0)
            {
                var toolCall = toolCalls[0];
                var functionName = toolCall?["function"]?["name"]?.ToString();
                var functionArgs = toolCall?["function"]?["arguments"]?.ToString();
                var toolCallId = toolCall?["id"]?.ToString();

                if (functionName == "web_search" && !string.IsNullOrEmpty(functionArgs))
                {
                    var argsNode = JsonNode.Parse(functionArgs);
                    var query = argsNode?["query"]?.ToString();

                    if (!string.IsNullOrEmpty(query))
                    {
                        // Execute search
                        var searchResult = await _tavilyService.SearchAsync(query);
                        
                        // Prepare follow-up messages
                        var conversation = messages.ToList();
                        
                        // 1. Add the assistant's tool call message
                        // We need to reconstruct the assistant message with tool_calls for the API
                        var assistantMsg = new Dictionary<string, object>
                        {
                            { "role", "assistant" },
                            { "content", null },
                            { "tool_calls", toolCalls }
                        };

                        // 2. Add the tool result message
                        var toolMsg = new
                        {
                            role = "tool",
                            tool_call_id = toolCallId,
                            name = "web_search",
                            content = searchResult
                        };

                        // Create a new request with the updated conversation
                        var followUpPayload = new Dictionary<string, object>
                        {
                            { "model", _model },
                            { "messages", conversation.Select(m => (object)new { role = m.Role, content = m.Content })
                                .Concat(new[] { assistantMsg, (object)toolMsg }).ToArray() }
                        };

                        var followUpResponse = await _httpClient.PostAsJsonAsync(Endpoint, followUpPayload);
                        
                        if (!followUpResponse.IsSuccessStatusCode)
                        {
                            var err = await followUpResponse.Content.ReadAsStringAsync();
                            throw new HttpRequestException($"Mistral API Error (Follow-up): {followUpResponse.StatusCode} - {err}");
                        }

                        var followUpNode = await followUpResponse.Content.ReadFromJsonAsync<JsonNode>();
                        return followUpNode?["choices"]?[0]?["message"]?["content"]?.ToString() ?? string.Empty;
                    }
                }
            }
        }

        return message?["content"]?.ToString() ?? string.Empty;
    }

    public async Task<string> GetResponseAsync(IEnumerable<Message> messages, ImageData? image)
    {
        if (image != null)
        {
            throw new NotSupportedException("Mistral models do not support image inputs. Please use Gemini, GPT-4o, or Claude for vision capabilities.");
        }
        return await GetResponseAsync(messages);
    }
}
