[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"
$RemotePath = "/www/wwwroot/test.txt"
$LocalPath = ".\test.txt"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

Write-Host "Uploading test.txt..."
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
    Write-Host "[OK] Uploaded: test.txt" -ForegroundColor Green
}
catch {
    Write-Host "[FAIL] Failed to upload test.txt : $($_.Exception.Message)" -ForegroundColor Red
}
