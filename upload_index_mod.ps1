$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$localPath = ".\CommanderGem\index-mod.html"
$remotePath = "/www/wwwroot/apps/commandergem/index-mod.html"

if (-not (Test-Path $localPath)) {
    Write-Error "Local file not found: $localPath"
    exit 1
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
    Write-Host "Upload Successful" -ForegroundColor Green
    $response.Close()
}
catch {
    Write-Error "Upload Failed: $($_.Exception.Message)"
}
