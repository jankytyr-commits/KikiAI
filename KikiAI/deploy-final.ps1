# Final FTP Deployment Script for KikiAI
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localPublishPath = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\publish"

Write-Host "=== KikiAI Final FTP Deployment ===" -ForegroundColor Green
Write-Host "Target: /www/wwwroot/ for static files" -ForegroundColor Yellow

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
        return $true
    }
}

# 1. Create directory structure
Write-Host "`n1. Creating directory structure..." -ForegroundColor Yellow
Create-FtpDirectory "/www/wwwroot"
Create-FtpDirectory "/www/wwwroot/apps"
Create-FtpDirectory "/www/wwwroot/apps/kikiai"
Create-FtpDirectory "/www/wwwroot/apps/kikiai/css"
Create-FtpDirectory "/www/wwwroot/apps/kikiai/js"

# 2. Upload frontend files
Write-Host "`n2. Uploading landing page..." -ForegroundColor Yellow
Upload-File "$localPublishPath\wwwroot\index.html" "/www/wwwroot/index.html"

# 3. Upload CSS files
Write-Host "`n3. Uploading CSS files..." -ForegroundColor Yellow
$cssFiles = Get-ChildItem "$localPublishPath\wwwroot\apps\kikiai\css\*.css" -File
foreach ($css in $cssFiles) {
    Upload-File $css.FullName "/www/wwwroot/apps/kikiai/css/$($css.Name)"
}

# 4. Upload JS files
Write-Host "`n4. Uploading JS files..." -ForegroundColor Yellow
$jsFiles = Get-ChildItem "$localPublishPath\wwwroot\apps\kikiai\js\*.js" -File
foreach ($js in $jsFiles) {
    Upload-File $js.FullName "/www/wwwroot/apps/kikiai/js/$($js.Name)"
}

# 5. Upload KikiAI index.html
Write-Host "`n5. Uploading KikiAI application index.html..." -ForegroundColor Yellow
Upload-File "$localPublishPath\wwwroot\apps\kikiai\index.html" "/www/wwwroot/apps/kikiai/index.html"

# 6. Clean up incorrect files (optional, but good practice)
# We won't delete them for now to avoid errors, just overwrite correct ones.

Write-Host "`n=== Deployment Complete! ===" -ForegroundColor Green
Write-Host "Landing page: http://www.ekobio.org/" -ForegroundColor Cyan
Write-Host "KikiAI app:   http://www.ekobio.org/apps/kikiai/" -ForegroundColor Cyan
