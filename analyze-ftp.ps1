[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

Write-Host "=== FTP Structure Analysis ===" -ForegroundColor Cyan
Write-Host ""

# Check /www/
Write-Host "--- Contents of /www/ ---" -ForegroundColor Yellow
$ftpUri = "ftp://$FtpServer/www/"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
$response = $request.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
$wwwItems = @()
while ($line = $reader.ReadLine()) { 
    $wwwItems += $line
    Write-Host "  $line"
}
$reader.Close()
$response.Close()

Write-Host ""
Write-Host "--- Contents of /www/wwwroot/ ---" -ForegroundColor Yellow
$ftpUri = "ftp://$FtpServer/www/wwwroot/"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
$response = $request.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
$wwwrootItems = @()
while ($line = $reader.ReadLine()) { 
    $wwwrootItems += $line
    Write-Host "  $line"
}
$reader.Close()
$response.Close()

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Green
Write-Host "Items in /www/: $($wwwItems.Count)"
Write-Host "Items in /www/wwwroot/: $($wwwrootItems.Count)"

if ($wwwItems -contains "publish") {
    Write-Host ""
    Write-Host "WARNING: 'publish' folder found in /www/" -ForegroundColor Red
}

if ($wwwrootItems -contains "js") {
    Write-Host ""
    Write-Host "OK: 'js' folder found in /www/wwwroot/" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "ERROR: 'js' folder NOT found in /www/wwwroot/" -ForegroundColor Red
}

if ($wwwrootItems -contains "css") {
    Write-Host "OK: 'css' folder found in /www/wwwroot/" -ForegroundColor Green
}
else {
    Write-Host "ERROR: 'css' folder NOT found in /www/wwwroot/" -ForegroundColor Red
}
