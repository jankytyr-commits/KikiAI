# Deploy KikiAI Redesign
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localRoot = ".\KikiAI\wwwroot\apps\kikiai"
$remoteRoot = "/www/wwwroot/apps/kikiai"

Write-Host "=== Deploying KikiAI Redesign ===" -ForegroundColor Cyan

function Upload-File {
    param($localFile, $remoteFile)
    try {
        $uri = "$ftpServer$remoteRoot/$remoteFile"
        Write-Host "Uploading: $localFile -> $remoteFile" -ForegroundColor Yellow
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $localFile)
        Write-Host "OK" -ForegroundColor Green
    }
    catch {
        Write-Host "FAILED: $_" -ForegroundColor Red
    }
}

# Upload JS
Upload-File "$localRoot\js\star-map.js" "js/star-map.js"

# Upload CSS
Upload-File "$localRoot\css\style.css" "css/style.css"

# Upload Index (with retry for cache busting)
Write-Host "Uploading index.html..." -ForegroundColor Cyan
for ($i = 1; $i -le 2; $i++) {
    Upload-File "$localRoot\index.html" "index.html"
    Start-Sleep -Milliseconds 500
}

Write-Host "`nDone! Check:" -ForegroundColor Cyan
Write-Host "http://www.ekobio.org/apps/kikiai/" -ForegroundColor Gray
