# Read Log File
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$logFile = "/www/logs/stdout_20251129224109_31956.log"

try {
    $uri = "$ftpServer$logFile"
    Write-Host "Reading $logFile..." -ForegroundColor Yellow
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $content = $webclient.DownloadString($uri)
    Write-Host $content
}
catch {
    Write-Host "Error reading log: $_" -ForegroundColor Red
}
