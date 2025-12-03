# Deploy Kikimmander Redesign
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localRoot = ".\CommanderGem"
$remoteRoot = "/www/wwwroot/apps/commandergem"

Write-Host "=== Deploying Kikimmander Redesign ===" -ForegroundColor Cyan

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

# Upload JS to root since js/ folder doesn't exist  
Upload-File "$localRoot\js\star-map.js" "star-map.js"

# Upload CSS
Upload-File "$localRoot\style.css" "style.css"

# Upload Index
Upload-File "$localRoot\index-mod.html" "index-mod.html"

Write-Host "`nDone! Check:" -ForegroundColor Cyan
Write-Host "http://www.ekobio.org/apps/commandergem/index-mod.html" -ForegroundColor Green
