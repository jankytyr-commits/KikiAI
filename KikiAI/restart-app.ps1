# Cleanup and Restart Script
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

function Delete-FtpDirectory {
    param (
        [string]$RemotePath
    )
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Deleting $RemotePath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " Failed: $_" -ForegroundColor Red }
}

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
        
        # Cleanup and Restart Script
        $ftpServer = "ftp://windows11.aspone.cz"
        $ftpUser = "EkoBio.org_lordkikin"
        $ftpPass = "Brzsilpot7!"

        function Delete-FtpDirectory {
            param (
                [string]$RemotePath
            )
            try {
                $uri = "$ftpServer$RemotePath"
                Write-Host "Deleting $RemotePath..." -NoNewline
                $request = [System.Net.FtpWebRequest]::Create($uri)
                $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
                $request.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
                $response = $request.GetResponse()
                $response.Close()
                Write-Host " Done" -ForegroundColor Green
            }
            catch { Write-Host " Failed: $_" -ForegroundColor Red }
        }

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

        # 1. Restart App
        Touch-WebConfig
