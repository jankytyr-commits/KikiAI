[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

# 1. Ensure logs directory exists
Write-Host "Creating logs directory..." -ForegroundColor Yellow
$ftpUri = "ftp://$FtpServer/www/logs"
try {
    $request = [System.Net.FtpWebRequest]::Create($ftpUri)
    $request.Credentials = $credentials
    $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $request.KeepAlive = $false
    $request.GetResponse().Close()
    Write-Host "Created logs directory." -ForegroundColor Green
}
catch {
    Write-Host "Logs directory probably already exists." -ForegroundColor Gray
}

# 2. Upload web.config
Write-Host "Uploading web.config with logging enabled..." -ForegroundColor Yellow
$localFile = ".\web_debug.config"
$remoteFile = "/www/web.config"
$ftpUri = "ftp://$FtpServer$remoteFile"

try {
    $request = [System.Net.FtpWebRequest]::Create($ftpUri)
    $request.Credentials = $credentials
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.UseBinary = $true
    $request.KeepAlive = $false
    
    $content = [System.IO.File]::ReadAllBytes($localFile)
    $request.ContentLength = $content.Length
    $s = $request.GetRequestStream()
    $s.Write($content, 0, $content.Length)
    $s.Close()
    $request.GetResponse().Close()
    Write-Host "Uploaded web.config successfully." -ForegroundColor Green
}
catch {
    Write-Host "Failed to upload web.config: $($_.Exception.Message)" -ForegroundColor Red
}
