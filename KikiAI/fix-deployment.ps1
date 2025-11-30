# Fix Root Deployment
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localPublishPath = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\publish"

function Delete-FtpFile {
    param ($RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Deleting $RemotePath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " Failed (or not found): $_" -ForegroundColor Gray }
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
    catch { Write-Host " Failed: $_" -ForegroundColor Red }
}

function Create-FtpDirectory {
    param ($RemotePath)
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
    catch { Write-Host " (Exists)" -ForegroundColor Gray }
}

function Upload-File {
    param ($LocalPath, $RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Uploading $(Split-Path $LocalPath -Leaf) -> $RemotePath..." -NoNewline
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $LocalPath)
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " Failed: $_" -ForegroundColor Red }
}

Write-Host "=== Fixing Root Deployment ===" -ForegroundColor Cyan

# 1. Fix web.config
# Delete the static one
Delete-FtpFile "/www/web.config"

# Try to move the real one from subfolder
# If it fails (e.g. not there), upload from local
try {
    Move-FtpFile "/www/apps/kikiai/web.config" "/www/web.config"
}
catch {
    Write-Host "Could not move web.config, uploading from local..." -ForegroundColor Yellow
    Upload-File "$localPublishPath\web.config" "/www/web.config"
}

# 2. Fix Directory Structure (Create wwwroot)
Write-Host "`n2. Setting up wwwroot..." -ForegroundColor Yellow
Create-FtpDirectory "/www/wwwroot"
Create-FtpDirectory "/www/wwwroot/apps"

# 3. Move Frontend to wwwroot
# Currently in /www/apps/kikiai/
# We want /www/wwwroot/apps/kikiai/
Write-Host "`n3. Moving Frontend to wwwroot..." -ForegroundColor Yellow
Move-FtpFile "/www/apps/kikiai" "/www/wwwroot/apps/kikiai"

# If rename of folder fails (some servers don't like it), we might need to move contents.
# But let's hope folder rename works. 
# If it fails, we will see error.

# 4. Ensure Landing Page is in wwwroot
# Currently /www/index.html (from revert)
# It should be in /www/wwwroot/index.html for the app to serve it as default file
Move-FtpFile "/www/index.html" "/www/wwwroot/index.html"

Write-Host "`n=== Fix Complete ===" -ForegroundColor Green
