# Revert to Root Deployment Script
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

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
        if ($_.Exception.InnerException.Response.StatusCode -ne 550) {
            Write-Host " Failed: $_" -ForegroundColor Red 
        }
        else {
            Write-Host " Not found (Skip)" -ForegroundColor Gray
        }
    }
}

function Move-Directory-Contents {
    param ($SourceDir, $TargetDir)
    try {
        $uri = "$ftpServer$SourceDir"
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $files = $reader.ReadToEnd() -split "`r`n" | Where-Object { $_ -ne "" }
        $reader.Close()
        $response.Close()

        foreach ($file in $files) {
            $fileName = Split-Path $file -Leaf
            Move-FtpFile "$SourceDir/$fileName" "$TargetDir/$fileName"
        }
    }
    catch { Write-Host "Error listing ${SourceDir}: $_" }
}

function Touch-WebConfig {
    try {
        $localPath = "temp-web.config"
        $remotePath = "/www/web.config"
        $uri = "$ftpServer$remotePath"
        Write-Host "Touching web.config to restart app..." -ForegroundColor Yellow
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.DownloadFile($uri, $localPath)
        $webclient.UploadFile($uri, $localPath)
        Remove-Item $localPath
        Write-Host "  [OK] Restart triggered" -ForegroundColor Green
    }
    catch { Write-Host "  [ERR] Failed to touch web.config: $_" -ForegroundColor Red }
}

Write-Host "=== Reverting KikiAI to Root Deployment ===" -ForegroundColor Cyan

# 1. Move Backend Files from /apps/kikiai/ to /www/
$backendFiles = @(
    "KikiAI.exe", "KikiAI.dll", "KikiAI.pdb", 
    "KikiAI.deps.json", "KikiAI.runtimeconfig.json", 
    "web.config", "appsettings.json", "appsettings.Production.json",
    "Microsoft.AspNetCore.OpenApi.dll", "Microsoft.EntityFrameworkCore.Abstractions.dll",
    "Microsoft.EntityFrameworkCore.dll", "Microsoft.EntityFrameworkCore.Relational.dll",
    "Microsoft.OpenApi.dll", "MySqlConnector.dll", "Pomelo.EntityFrameworkCore.MySql.dll"
)

Write-Host "`n1. Moving Backend Files..." -ForegroundColor Yellow
foreach ($file in $backendFiles) {
    Move-FtpFile "/www/apps/kikiai/$file" "/www/$file"
}

# 2. Move Data Directories (Chats, Config) back to Root
Write-Host "`n2. Moving Data Directories..." -ForegroundColor Yellow
Move-FtpFile "/www/apps/kikiai/Chats" "/www/Chats"
Move-FtpFile "/www/apps/kikiai/Config" "/www/Config"

# 3. Fix Frontend Structure
Write-Host "`n3. Adjusting Frontend Paths..." -ForegroundColor Yellow
Move-FtpFile "/www/apps/kikiai/wwwroot/index.html" "/www/apps/kikiai/index.html"
Move-FtpFile "/www/apps/kikiai/wwwroot/css" "/www/apps/kikiai/css"
Move-FtpFile "/www/apps/kikiai/wwwroot/js" "/www/apps/kikiai/js"

# 4. Cleanup
Write-Host "`n4. Cleanup..." -ForegroundColor Yellow
try {
    $uri = "$ftpServer/www/apps/kikiai/wwwroot"
    $request = [System.Net.FtpWebRequest]::Create($uri)
    $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
    $response = $request.GetResponse()
    $response.Close()
    Write-Host "Removed empty wwwroot folder" -ForegroundColor Green
}
catch { Write-Host "Could not remove wwwroot (maybe not empty?)" -ForegroundColor Gray }

# 5. Restart
Write-Host "`n5. Restarting App..." -ForegroundColor Yellow
Touch-WebConfig

Write-Host "`n=== Revert Complete ===" -ForegroundColor Green
