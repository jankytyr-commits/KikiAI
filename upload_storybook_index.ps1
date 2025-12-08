$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

$localFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\index.html"
$remoteFile = "$server/www/wwwroot/apps/KiStorybook/index.html"

Write-Host "Uploading fixed index.html..." -ForegroundColor Cyan

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

try {
    $webclient.UploadFile($remoteFile, $localFile)
    Write-Host "SUCCESS!" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
