using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

public class TavilyService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private const string Endpoint = "https://api.tavily.com/search";

    public TavilyService(IHttpClientFactory httpClientFactory, string apiKey)
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = apiKey;
    }

    public async Task<string> SearchAsync(string query)
    {
        var request = new
        {
            api_key = _apiKey,
            query = query,
            max_results = 5,
            include_answer = true,
            include_raw_content = false
        };

        var response = await _httpClient.PostAsJsonAsync(Endpoint, request);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Tavily API Error: {response.StatusCode} - {error}");
        }

        var result = await response.Content.ReadFromJsonAsync<TavilyResponse>();
        
        if (result == null)
            return "No search results found.";

        // Format results
        var formatted = new System.Text.StringBuilder();
        
        if (!string.IsNullOrEmpty(result.Answer))
        {
            formatted.AppendLine($"Answer: {result.Answer}");
            formatted.AppendLine();
        }

        if (result.Results != null && result.Results.Any())
        {
            formatted.AppendLine("Search Results:");
            foreach (var item in result.Results)
            {
                formatted.AppendLine($"- {item.Title}");
                formatted.AppendLine($"  URL: {item.Url}");
                formatted.AppendLine($"  {item.Content}");
                formatted.AppendLine();
            }
        }

        return formatted.ToString();
    }

    private class TavilyResponse
    {
        public string Answer { get; set; }
        public List<SearchResult> Results { get; set; }
    }

    private class SearchResult
    {
        public string Title { get; set; }
        public string Url { get; set; }
        public string Content { get; set; }
    }
}
