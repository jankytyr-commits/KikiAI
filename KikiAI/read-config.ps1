# Read Web Config
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

try {
    $uri = "$ftpServer/www/web.config"
    Write-Host "Reading /www/web.config..." -ForegroundColor Yellow
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $content = $webclient.DownloadString($uri)
    Write-Host $content
}
catch { Write-Host "Error reading web.config: $_" -ForegroundColor Red }
