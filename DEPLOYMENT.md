# KikiAI - Deployment Guide for ASPone Hosting

## Prerequisites
- ASPone Linux hosting with .NET 8 support
- FTP client (FileZilla, WinSCP, or built-in Windows FTP)
- Your API keys ready

## Deployment Steps

### 1. Deploy the Application
Run the deployment script from the project root:
```powershell
.\deploy-ftp.ps1
```

This script will:
- Recursively upload all files from `./KikiAI/publish` to your FTP server
- Create necessary directories automatically
- Skip unnecessary files (.gz)

### 2. Configure Environment Variables on ASPone

You need to set these environment variables in ASPone control panel:

```
Gemini__ApiKey=your_gemini_api_key
OpenAI__ApiKey=your_openai_api_key
OpenAI__TestKey=your_openai_test_key
Claude__ApiKey=your_claude_api_key
Mistral__ApiKey=your_mistral_api_key
Tavily__ApiKey=your_tavily_api_key
```

**Note:** Use double underscores `__` to represent nested configuration (e.g., `Gemini__ApiKey` = `Gemini:ApiKey`)

### 4. Configure ASPone Startup

In ASPone control panel, set the startup command:
```
dotnet KikiAI.dll
```

Set the environment to `Production`:
```
ASPNETCORE_ENVIRONMENT=Production
```

### 5. Verify Deployment

Once deployed, access your application at:
```
http://ekobio.org
```

or

```
https://ekobio.org
```

## Troubleshooting

### Application doesn't start
- Check ASPone supports .NET 8
- Verify all files were uploaded
- Check environment variables are set correctly

### API calls fail
- Verify API keys are set in environment variables
- Check `appsettings.Production.json` is present

### Static files not loading
- Ensure `wwwroot` folder was uploaded
- Check file permissions on server

## Security Notes

- Never commit `appsettings.json` with real API keys
- Always use environment variables for production
- `api-keys.json` is in `.gitignore` and should never be uploaded to Git
- Keep your FTP credentials secure

## Support

For ASPone specific issues, contact: https://www.aspone.cz/kontakt
