[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

$ftpUri = "ftp://$FtpServer/www/web.config"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
$request.KeepAlive = $false

$response = $request.GetResponse()
$responseStream = $response.GetResponseStream()
$reader = New-Object System.IO.StreamReader($responseStream)
$content = $reader.ReadToEnd()
$reader.Close()
$response.Close()

Write-Host $content
Set-Content -Path "downloaded_web.config" -Value $content
