# Cleanup and Restart Script V2
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

function Touch-WebConfig {
    try {
        $localPath = "temp-web.config"
        $remotePath = "/www/web.config"
        $uri = "$ftpServer$remotePath"
        
        Write-Host "Touching web.config to restart app..." -ForegroundColor Yellow
        
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        
        # Download
        $webclient.DownloadFile($uri, $localPath)
        
        # Upload back
        $webclient.UploadFile($uri, $localPath)
        
        # Cleanup
        Remove-Item $localPath
        
        Write-Host "  [OK] Restart triggered" -ForegroundColor Green
    }
    catch { Write-Host "  [ERR] Failed to touch web.config: $_" -ForegroundColor Red }
}

# Restart App
Touch-WebConfig
