# KikiAI - Multi-AI Chat Application

Multi-provider AI chat application supporting Gemini, OpenAI, Claude, and Mistral models with automatic fallback and usage tracking.

## Features

- 🤖 **Multiple AI Providers**: Gemini 2.0/2.5, OpenAI GPT-4o/mini, Claude 3.5 Sonnet/Haiku, Mistral Small/Large
- 🔄 **Automatic Fallback**: Switches to alternative models when quota is exceeded
- 📊 **Usage Tracking**: Real-time token counting and cost monitoring for Claude
- 💾 **Chat Persistence**: Saves conversation history to files
- 🎨 **Modern UI**: Dark theme with model selector and notifications
- 🔍 **Web Search**: Tavily integration for Claude and Mistral (optional)

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd KikiAI
```

### 2. Configure API Keys

Copy the example configuration file:

```bash
cp KikiAI/appsettings.example.json KikiAI/appsettings.json
```

Edit `KikiAI/appsettings.json` and add your API keys:

- **Gemini**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Claude**: Get from [Anthropic Console](https://console.anthropic.com/)
- **Mistral**: Get from [Mistral AI](https://console.mistral.ai/)
- **Tavily** (optional): Get from [Tavily](https://tavily.com/)

### 3. Run the application

```bash
cd KikiAI
dotnet run
```

Open your browser at `http://localhost:5068`

## Project Structure

```
KikiAI/
├── KikiAI/
│   ├── ChatController.cs       # API endpoints
│   ├── ChatService.cs          # Chat persistence
│   ├── GeminiProvider.cs       # Gemini integration
│   ├── OpenAIProvider.cs       # OpenAI integration
│   ├── ClaudeProvider.cs       # Claude integration
│   ├── MistralProvider.cs      # Mistral integration
│   ├── TavilyService.cs        # Web search service
│   ├── ClaudeUsageTracker.cs   # Usage monitoring
│   ├── wwwroot/
│   │   └── index.html          # Frontend UI
│   └── appsettings.json        # Configuration (not in git)
├── .gitignore
└── README.md
```

## Usage

1. Select your preferred AI model from the top bar
2. Type your message in the input area
3. Press **Enter** to send or **Ctrl+Enter** for new line
4. Use menu buttons to:
   - 🔄 Repeat last message
   - ➕ Start new chat
   - 💾 Export chat history

## Configuration

### Token Limits (per conversation)

- Gemini 2.0/2.5: 1,000,000 tokens
- OpenAI GPT-4o/mini: 128,000 tokens
- Claude 3.5: 200,000 tokens
- Mistral Small: 32,000 tokens
- Mistral Large: 128,000 tokens

### Claude Cost Tracking

The application tracks Claude API usage and automatically disables the provider when approaching the $5.00 monthly limit (safety threshold: $4.50).

## Development

Built with:
- **Backend**: ASP.NET Core 9.0
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **APIs**: Google Gemini, OpenAI, Anthropic Claude, Mistral AI

## Security Notes

⚠️ **Important**: Never commit `appsettings.json` with real API keys to version control!

- API keys are stored in `appsettings.json` (gitignored)
- Use `appsettings.example.json` as a template
- Chat history is saved locally in `Chats/` folder

## License

MIT License - feel free to use and modify!
