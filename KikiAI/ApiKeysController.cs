using Microsoft.AspNetCore.Mvc;
using KikiAI;

namespace KikiAI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApiKeysController : ControllerBase
{
    private readonly ApiKeyService _keyService;
    private readonly IHttpClientFactory _httpFactory;

    public ApiKeysController(ApiKeyService keyService, IHttpClientFactory httpFactory)
    {
        _keyService = keyService;
        _httpFactory = httpFactory;
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateKey([FromBody] ValidateKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Key))
            return BadRequest(new { isValid = false, message = "Klíč je prázdný" });

        var isValid = await CheckProviderKey(request.Provider, request.Key);
        return Ok(new { isValid, message = isValid ? "Klíč je platný" : "Klíč je neplatný" });
    }

    private async Task<bool> CheckProviderKey(string provider, string key)
    {
        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5); // Quick timeout

            switch (provider.ToLower())
            {
                case "gemini":
                case "gemini-2.5":
                    // Gemini uses query param
                    var response = await client.GetAsync($"https://generativelanguage.googleapis.com/v1beta/models?key={key}");
                    return response.IsSuccessStatusCode;

                case "openai":
                case "openai-test":
                    // OpenAI uses Bearer token
                    var reqOpenAI = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
                    reqOpenAI.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", key);
                    var respOpenAI = await client.SendAsync(reqOpenAI);
                    return respOpenAI.IsSuccessStatusCode;

                case "claude":
                case "claude-haiku":
                    // Anthropic uses x-api-key header
                    var reqClaude = new HttpRequestMessage(HttpMethod.Get, "https://api.anthropic.com/v1/models");
                    reqClaude.Headers.Add("x-api-key", key);
                    reqClaude.Headers.Add("anthropic-version", "2023-06-01");
                    var respClaude = await client.SendAsync(reqClaude);
                    return respClaude.IsSuccessStatusCode;

                case "mistral":
                case "mistral-large":
                    // Mistral uses Bearer token
                    var reqMistral = new HttpRequestMessage(HttpMethod.Get, "https://api.mistral.ai/v1/models");
                    reqMistral.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", key);
                    var respMistral = await client.SendAsync(reqMistral);
                    return respMistral.IsSuccessStatusCode;

                default:
                    return false;
            }
        }
        catch
        {
            return false;
        }
    }

    [HttpGet("{provider}")]
    public IActionResult GetProviderKeys(string provider)
    {
        var keys = _keyService.GetProviderKeys(provider);
        return Ok(keys);
    }

    [HttpPost("{provider}")]
    public IActionResult AddKey(string provider, [FromBody] AddKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Key))
            return BadRequest(new { success = false, message = "Klíč nesmí být prázdný." });

        if (!_keyService.ValidateKey(provider, request.Key))
            return BadRequest(new { success = false, message = "Neplatný formát API klíče." });

        var usage = new ApiKeyUsage();
        
        // Set limits based on provider
        switch (provider.ToLower())
        {
            case "gemini":
            case "gemini-2.5":
                usage.TokenLimit = 1000000;
                usage.Tokens = 0;
                break;
            case "openai":
            case "openai-test":
                usage.TokenLimit = 128000;
                usage.Tokens = 0;
                break;
            case "claude":
            case "claude-haiku":
                usage.CostLimit = 5.00m;
                usage.Cost = 0;
                break;
            case "mistral":
                usage.TokenLimit = 32000;
                usage.Tokens = 0;
                break;
            case "mistral-large":
                usage.TokenLimit = 128000;
                usage.Tokens = 0;
                break;
        }

        _keyService.AddKey(provider, request.Alias, request.Key, usage);
        return Ok(new { success = true, message = "Klíč byl úspěšně přidán." });
    }

    [HttpDelete("{provider}/{keyId}")]
    public IActionResult RemoveKey(string provider, string keyId)
    {
        var result = _keyService.RemoveKey(provider, keyId);
        if (result)
            return Ok(new { success = true, message = "Klíč byl odstraněn." });
        return NotFound(new { success = false, message = "Klíč nebyl nalezen." });
    }

    [HttpPut("{provider}/active/{keyId}")]
    public IActionResult SetActiveKey(string provider, string keyId)
    {
        var result = _keyService.SetActiveKey(provider, keyId);
        if (result)
            return Ok(new { success = true, message = "Aktivní klíč byl nastaven." });
        return NotFound(new { success = false, message = "Klíč nebyl nalezen." });
    }
}

public class AddKeyRequest
{
    public string Alias { get; set; } = "Unnamed Key";
    public string Key { get; set; } = string.Empty;
}


public class ValidateKeyRequest
{
    public string Provider { get; set; }
    public string Key { get; set; }
}
