# Reorganize FTP Script
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

function Create-FtpDirectory {
    param ([string]$RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Creating $RemotePath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " (Exists/Skip)" -ForegroundColor Gray }
}

function Move-FtpFile {
    param ($OldPath, $NewPath)
    try {
        $uri = "$ftpServer$OldPath"
        Write-Host "Moving $OldPath -> $NewPath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::Rename
        $request.RenameTo = $NewPath
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { 
        # Ignore 550 if file doesn't exist (maybe already moved)
        if ($_.Exception.InnerException.Response.StatusCode -ne 550) {
            Write-Host " Failed: $_" -ForegroundColor Red 
        }
        else {
            Write-Host " Not found (Skip)" -ForegroundColor Gray
        }
    }
}

Write-Host "=== Reorganizing FTP Structure ===" -ForegroundColor Cyan

# 1. Create Target Directories
Create-FtpDirectory "/www/apps"
Create-FtpDirectory "/www/apps/kikiai"
Create-FtpDirectory "/www/apps/kikiai/wwwroot"
Create-FtpDirectory "/www/apps/kikiai/Chats"
Create-FtpDirectory "/www/apps/kikiai/Config"

# 2. Move Backend Files
$backendFiles = @(
    "KikiAI.exe", "KikiAI.dll", "KikiAI.pdb", 
    "KikiAI.deps.json", "KikiAI.runtimeconfig.json", 
    "web.config", "appsettings.json", "appsettings.Production.json",
    "Microsoft.AspNetCore.OpenApi.dll", "Microsoft.EntityFrameworkCore.Abstractions.dll",
    "Microsoft.EntityFrameworkCore.dll", "Microsoft.EntityFrameworkCore.Relational.dll",
    "Microsoft.OpenApi.dll", "MySqlConnector.dll", "Pomelo.EntityFrameworkCore.MySql.dll"
)

foreach ($file in $backendFiles) {
    Move-FtpFile "/www/$file" "/www/apps/kikiai/$file"
}

# 3. Move Data Directories (Chats, Config)
# Moving directories via Rename is supported by some FTP servers. Let's try.
Move-FtpFile "/www/Chats" "/www/apps/kikiai/Chats"
Move-FtpFile "/www/Config" "/www/apps/kikiai/Config"

# 4. Move Frontend Files
# Currently in /www/wwwroot/apps/kikiai/
# We want them in /www/apps/kikiai/wwwroot/
# Note: /www/apps/kikiai/wwwroot already exists from step 1.
# We need to move the CONTENTS of /www/wwwroot/apps/kikiai/ to /www/apps/kikiai/wwwroot/

# Let's try to move the whole 'kikiai' folder from wwwroot to apps?
# No, 'apps/kikiai' already exists.
# We need to move 'css', 'js', 'index.html' from /www/wwwroot/apps/kikiai/ to /www/apps/kikiai/wwwroot/

Move-FtpFile "/www/wwwroot/apps/kikiai/index.html" "/www/apps/kikiai/wwwroot/index.html"
Move-FtpFile "/www/wwwroot/apps/kikiai/css" "/www/apps/kikiai/wwwroot/css"
Move-FtpFile "/www/wwwroot/apps/kikiai/js" "/www/apps/kikiai/wwwroot/js"

# 5. Cleanup
# We can try to remove empty directories later.

Write-Host "`n=== Reorganization Complete ===" -ForegroundColor Green
Write-Host "IMPORTANT: You MUST configure '/apps/kikiai' as an Application in Aspone Control Panel!" -ForegroundColor Yellow
