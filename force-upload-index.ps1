[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"
$RemotePath = "/www/wwwroot/index.html"
$LocalPath = ".\KikiAI\publish\wwwroot\index.html"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

Write-Host "Force uploading index.html..."
try {
    $ftpUri = "ftp://$FtpServer$RemotePath"
    $request = [System.Net.FtpWebRequest]::Create($ftpUri)
    $request.Credentials = $credentials
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.UseBinary = $true
    $request.KeepAlive = $false
    $request.EnableSsl = $false
    
    $content = [System.IO.File]::ReadAllBytes($LocalPath)
    $request.ContentLength = $content.Length
    $s = $request.GetRequestStream()
    $s.Write($content, 0, $content.Length)
    $s.Close()
    $request.GetResponse().Close()
    Write-Host "[OK] Force Uploaded: index.html" -ForegroundColor Green
}
catch {
    Write-Host "[FAIL] Failed to upload index.html : $($_.Exception.Message)" -ForegroundColor Red
}
