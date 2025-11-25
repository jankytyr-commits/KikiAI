using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

public interface IAIProvider
{
    Task<string> GetResponseAsync(IEnumerable<Message> messages);
    Task<string> GetResponseAsync(IEnumerable<Message> messages, ImageData? image);
}



public class Message
{
    public Message() { }
    public Message(string role, string content)
    {
        Role = role;
        Content = content;
    }

    public string Role { get; set; } = "";

    public string Content { get; set; } = "";
}
