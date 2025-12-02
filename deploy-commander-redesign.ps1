# Deploy Kikimmander Redesign
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localPath = ".\CommanderGem"
$remotePath = "/www/wwwroot/apps/commandergem"

Write-Host "=== Deploying Kikimmander Redesign ===" -ForegroundColor Cyan

function Upload-File {
    param($file, $remoteName)
    try {
        $uri = "$ftpServer$remotePath/$remoteName"
        Write-Host "Uploading: $file -> $remoteName" -ForegroundColor Yellow
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $file)
        Write-Host "OK" -ForegroundColor Green
        Start-Sleep -Milliseconds 500  # Small delay between uploads
    }
    catch {
        Write-Host "FAILED: $_" -ForegroundColor Red
    }
}

# Upload to index.html (default view)
Upload-File "$localPath\index-mod.html" "index.html"

# Upload styles first
Upload-File "$localPath\style.css" "style.css"

# Upload to index-mod.html explicitly (with retry)
Write-Host "Uploading index-mod.html with verification..." -ForegroundColor Cyan
for ($i = 1; $i -le 3; $i++) {
    Upload-File "$localPath\index-mod.html" "index-mod.html"
    Start-Sleep -Seconds 1
}

Write-Host "Done! Check:" -ForegroundColor Cyan
Write-Host "http://www.ekobio.org/apps/commandergem/index.html" -ForegroundColor Gray
Write-Host "http://www.ekobio.org/apps/commandergem/index-mod.html" -ForegroundColor Gray
