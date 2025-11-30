# FTP Deployment Script for KikiAI
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localPublishPath = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\publish"

Write-Host "=== KikiAI FTP Deployment ===" -ForegroundColor Green

# Function to upload file
function Upload-File {
    param (
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Uploading: $LocalPath -> $RemotePath" -ForegroundColor Cyan
        
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $LocalPath)
        
        Write-Host "  ✓ Success" -ForegroundColor Green
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
        Write-Host "Creating directory: $RemotePath" -ForegroundColor Yellow
        
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $response = $request.GetResponse()
        $response.Close()
        
        Write-Host "  ✓ Directory created" -ForegroundColor Green
        return $true
    }
    catch {
        # Directory might already exist, that's ok
        if ($_.Exception.InnerException.Response.StatusCode -eq 550) {
            Write-Host "  - Directory already exists" -ForegroundColor Gray
            return $true
        }
        Write-Host "  ✗ Failed: $_" -ForegroundColor Red
        return $false
    }
}

# Create directory structure
Write-Host "`n1. Creating directory structure..." -ForegroundColor Yellow
Create-FtpDirectory "/www"
Create-FtpDirectory "/www/wwwroot"
Create-FtpDirectory "/www/wwwroot/apps"
Create-FtpDirectory "/www/wwwroot/apps/kikiai"
Create-FtpDirectory "/www/wwwroot/apps/kikiai/css"
Create-FtpDirectory "/www/wwwroot/apps/kikiai/js"
Create-FtpDirectory "/www/Chats"
Create-FtpDirectory "/www/Config"

Write-Host "`n2. Uploading backend files to /www/..." -ForegroundColor Yellow
# Upload main backend files
Upload-File "$localPublishPath\KikiAI.exe" "/www/KikiAI.exe"
Upload-File "$localPublishPath\KikiAI.dll" "/www/KikiAI.dll"
Upload-File "$localPublishPath\KikiAI.pdb" "/www/KikiAI.pdb"
Upload-File "$localPublishPath\KikiAI.deps.json" "/www/KikiAI.deps.json"
Upload-File "$localPublishPath\KikiAI.runtimeconfig.json" "/www/KikiAI.runtimeconfig.json"
Upload-File "$localPublishPath\web.config" "/www/web.config"
Upload-File "$localPublishPath\appsettings.json" "/www/appsettings.json"
Upload-File "$localPublishPath\appsettings.Production.json" "/www/appsettings.Production.json"

# Upload DLL libraries
Write-Host "`n3. Uploading DLL libraries..." -ForegroundColor Yellow
$dlls = Get-ChildItem "$localPublishPath\*.dll" -File
foreach ($dll in $dlls) {
    Upload-File $dll.FullName "/www/$($dll.Name)"
}

Write-Host "`n4. Uploading frontend files..." -ForegroundColor Yellow
# Upload landing page
Upload-File "$localPublishPath\wwwroot\index.html" "/www/wwwroot/index.html"

# Upload CSS files
Write-Host "`n5. Uploading CSS files..." -ForegroundColor Yellow
$cssFiles = Get-ChildItem "$localPublishPath\wwwroot\apps\kikiai\css\*.css" -File
foreach ($css in $cssFiles) {
    Upload-File $css.FullName "/www/wwwroot/apps/kikiai/css/$($css.Name)"
}

# Upload JS files
Write-Host "`n6. Uploading JS files..." -ForegroundColor Yellow
$jsFiles = Get-ChildItem "$localPublishPath\wwwroot\apps\kikiai\js\*.js" -File
foreach ($js in $jsFiles) {
    Upload-File $js.FullName "/www/wwwroot/apps/kikiai/js/$($js.Name)"
}

# Upload KikiAI index.html
Write-Host "`n7. Uploading KikiAI application..." -ForegroundColor Yellow
Upload-File "$localPublishPath\wwwroot\apps\kikiai\index.html" "/www/wwwroot/apps/kikiai/index.html"

Write-Host "`n=== Deployment Complete! ===" -ForegroundColor Green
Write-Host "Landing page: http://www.ekobio.org/" -ForegroundColor Cyan
Write-Host "KikiAI app:   http://www.ekobio.org/apps/kikiai/" -ForegroundColor Cyan
