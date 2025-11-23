using System.Collections.Generic;
using System.Threading.Tasks;

public interface IAIProvider
{
    Task<string> GetResponseAsync(IEnumerable<Message> messages);
}

public record Message(string Role, string Content);
