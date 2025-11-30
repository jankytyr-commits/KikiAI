$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\index.html"
$remotePath = "/www/wwwroot/index.html"

try {
    $uri = "$ftpServer$remotePath"
    Write-Host "Uploading index.html -> $remotePath..." -NoNewline
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $webclient.UploadFile($uri, $localFile)
    Write-Host " Done" -ForegroundColor Green
}
catch { Write-Host " Failed: $_" -ForegroundColor Red }
