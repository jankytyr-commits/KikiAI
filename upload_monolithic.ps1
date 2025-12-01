$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$remoteBase = "/www/wwwroot/apps/commandergem/"

$files = @(
    @{ Local = ".\CommanderGem\js\main-fallback.js"; Remote = "js/main-fallback.js" },
    @{ Local = ".\CommanderGem\index-mod.html"; Remote = "index-mod.html" }
)

foreach ($file in $files) {
    $localPath = $file.Local
    $remotePath = $remoteBase + $file.Remote
    
    if (-not (Test-Path $localPath)) {
        Write-Error "Local file not found: $localPath"
        continue
    }

    Write-Host "Uploading $localPath -> $remotePath..." -ForegroundColor Cyan

    try {
        $ftpUrl = "ftp://windows11.aspone.cz$remotePath"
        $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUrl)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        
        $content = [System.IO.File]::ReadAllBytes($localPath)
        $ftpRequest.ContentLength = $content.Length
        
        $requestStream = $ftpRequest.GetRequestStream()
        $requestStream.Write($content, 0, $content.Length)
        $requestStream.Close()
        
        $response = $ftpRequest.GetResponse()
        Write-Host "Upload Successful: $($file.Remote)" -ForegroundColor Green
        $response.Close()
    }
    catch {
        Write-Error "Upload Failed for $($file.Remote): $($_.Exception.Message)"
    }
}
