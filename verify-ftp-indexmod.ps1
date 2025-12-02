# Verify what's actually on the FTP server
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$remotePath = "/www/wwwroot/apps/commandergem/index-mod.html"
$localCheck = ".\CommanderGem\index-mod-downloaded.html"

Write-Host "=== Downloading index-mod.html from FTP ===" -ForegroundColor Cyan

try {
    $uri = "$ftpServer$remotePath"
    Write-Host "Downloading from: $uri" -ForegroundColor Yellow
    
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $webclient.DownloadFile($uri, $localCheck)
    
    Write-Host "Downloaded to: $localCheck" -ForegroundColor Green
    
    # Check file size
    $downloadedSize = (Get-Item $localCheck).Length
    $localSize = (Get-Item ".\CommanderGem\index-mod.html").Length
    
    Write-Host "`nFile Sizes:" -ForegroundColor Cyan
    Write-Host "  Local source:  $localSize bytes" -ForegroundColor White
    Write-Host "  FTP download:  $downloadedSize bytes" -ForegroundColor White
    
    if ($downloadedSize -eq $localSize) {
        Write-Host "`nSizes match! File uploaded correctly." -ForegroundColor Green
    }
    else {
        Write-Host "`nWARNING: Sizes don't match!" -ForegroundColor Red
    }
    
    # Check for version string
    $content = Get-Content $localCheck -Raw
    if ($content -match 'nexus3') {
        Write-Host "Version string 'nexus3' found in FTP file." -ForegroundColor Green
    }
    else {
        Write-Host "WARNING: 'nexus3' not found in FTP file!" -ForegroundColor Red
    }
    
}
catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}
