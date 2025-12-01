$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$remotePath = "/www/wwwroot/apps/commandergem/js/ui.js"
$localPath = ".\downloaded_ui.js"

try {
    $ftpUrl = "ftp://windows11.aspone.cz$remotePath"
    $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUrl)
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
    $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    
    $response = $ftpRequest.GetResponse()
    $stream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $content = $reader.ReadToEnd()
    
    $reader.Close()
    $response.Close()
    
    if ($content -match "HTTP Fallback") {
        Write-Host "File contains 'HTTP Fallback'" -ForegroundColor Green
    }
    else {
        Write-Error "File DOES NOT contain 'HTTP Fallback'"
    }
    
    $content | Out-File -FilePath $localPath -Encoding utf8
}
catch {
    Write-Error "Download Failed: $($_.Exception.Message)"
}
