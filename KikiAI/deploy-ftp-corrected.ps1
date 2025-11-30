# FTP Deployment Script for KikiAI - CORRECTED for Aspone
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localPublishPath = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\publish"

Write-Host "=== KikiAI FTP Deployment (Aspone Corrected) ===" -ForegroundColor Green
Write-Host "NOTE: On Aspone, /www/ is the webroot!" -ForegroundColor Yellow

# Function to upload file
function Upload-File {
    param (
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Uploading: $(Split-Path $LocalPath -Leaf) -> $RemotePath" -ForegroundColor Cyan
        
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $LocalPath)
        
        return $true
    }
    catch {
        Write-Host "  ✗ Failed: $_" -ForegroundColor Red
        return $false
    }
}

# Function to create directory
function Create-FtpDirectory {
    param (
        [string]$RemotePath
    )
    
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Creating directory: $RemotePath" -ForegroundColor Gray
        
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $response = $request.GetResponse()
        $response.Close()
        
        return $true
    }
    catch {
        # Directory might already exist
        return $true
    }
}

# Create directory structure in /www/ (webroot)
Write-Host "`n1. Creating directory structure in /www/ (webroot)..." -ForegroundColor Yellow
Create-FtpDirectory "/www/apps"
Create-FtpDirectory "/www/apps/kikiai"
Create-FtpDirectory "/www/apps/kikiai/css"
Create-FtpDirectory "/www/apps/kikiai/js"
Create-FtpDirectory "/www/Chats"
Create-FtpDirectory "/www/Config"

# Upload frontend files
Write-Host "`n2. Uploading landing page to /www/..." -ForegroundColor Yellow
Upload-File "$localPublishPath\wwwroot\index.html" "/www/index.html"

# Upload CSS files
Write-Host "`n3. Uploading CSS files..." -ForegroundColor Yellow
$cssFiles = Get-ChildItem "$localPublishPath\wwwroot\apps\kikiai\css\*.css" -File
foreach ($css in $cssFiles) {
    Upload-File $css.FullName "/www/apps/kikiai/css/$($css.Name)"
}

# Upload JS files
Write-Host "`n4. Uploading JS files..." -ForegroundColor Yellow
$jsFiles = Get-ChildItem "$localPublishPath\wwwroot\apps\kikiai\js\*.js" -File
foreach ($js in $jsFiles) {
    Upload-File $js.FullName "/www/apps/kikiai/js/$($js.Name)"
}

# Upload KikiAI index.html
Write-Host "`n5. Uploading KikiAI application index.html..." -ForegroundColor Yellow
Upload-File "$localPublishPath\wwwroot\apps\kikiai\index.html" "/www/apps/kikiai/index.html"

Write-Host "`n=== Deployment Complete! ===" -ForegroundColor Green
Write-Host "Landing page: http://www.ekobio.org/" -ForegroundColor Cyan
Write-Host "KikiAI app:   http://www.ekobio.org/apps/kikiai/" -ForegroundColor Cyan
Write-Host "`nBackend files are already in /www/ from previous upload" -ForegroundColor Gray
