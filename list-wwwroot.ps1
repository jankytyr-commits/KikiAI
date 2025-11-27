[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

Write-Host "=== Files in /www/wwwroot/ ===" -ForegroundColor Cyan
$ftpUri = "ftp://$FtpServer/www/wwwroot/"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
$request.KeepAlive = $false

$response = $request.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
$files = @()
while ($line = $reader.ReadLine()) { 
    $files += $line
    Write-Host "  $line"
}
$reader.Close()
$response.Close()

Write-Host "`nTotal: $($files.Count) items" -ForegroundColor Green
