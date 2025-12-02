# Deploy Nexus Portal Landing Page
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localFile = ".\nexus-temp\index-static.html"
$remotePath = "/www/wwwroot/index.html"

Write-Host "=== Deploying Nexus Portal Landing Page ===" -ForegroundColor Cyan

try {
    $uri = "$ftpServer$remotePath"
    Write-Host "Uploading: $localFile -> $remotePath" -ForegroundColor Yellow
    
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $webclient.UploadFile($uri, $localFile)
    
    Write-Host "SUCCESS! Landing page updated." -ForegroundColor Green
    Write-Host "Check it at: http://www.ekobio.org/" -ForegroundColor Cyan
}
catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    exit 1
}
