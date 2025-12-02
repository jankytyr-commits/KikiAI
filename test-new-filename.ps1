# Upload to a NEW filename to test if caching is the issue
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localPath = ".\CommanderGem"
$remotePath = "/www/wwwroot/apps/commandergem"

Write-Host "=== Uploading to NEW filename for testing ===" -ForegroundColor Cyan

function Upload-File {
    param($file, $remoteName)
    try {
        $uri = "$ftpServer$remotePath/$remoteName"
        Write-Host "Uploading: $file -> $remoteName" -ForegroundColor Yellow
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $file)
        Write-Host "OK" -ForegroundColor Green
    }
    catch {
        Write-Host "FAILED: $_" -ForegroundColor Red
    }
}

# Upload with timestamp in filename
$timestamp = Get-Date -Format "HHmmss"
$newFilename = "index-mod-$timestamp.html"

Upload-File "$localPath\index-mod.html" $newFilename

Write-Host "`nTest this URL:" -ForegroundColor Cyan
Write-Host "http://www.ekobio.org/apps/commandergem/$newFilename" -ForegroundColor Yellow
